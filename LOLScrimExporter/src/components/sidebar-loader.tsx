import { graphqlQuery, graphqlVariables } from '@/lib/constants';
import { useEffect, useState } from 'react';
import MoonLoader from 'react-spinners/MoonLoader';
import InfiniteScroll from './ui/infinite-scroll';
import { DateRange } from 'react-day-picker';
import { GameStats } from '@/lib/types/gameStats';
import { getAuthToken } from '@/lib/utils';

// Type for a single player
export interface Player {
  id: string;
  name: string;
  character?: {
    id: string;
    name: string;
  };
}

// Filter
// - Per TEAM
// - Losses? Wins?
// - Champions
// - Filter based on bans?
// - Start Date, end date
// - ASC DESC

// Other Things to do
// - Draft Order + Bans
// UI/UX
// Downloadable Files
// Date

// Type for a game
export interface Game {
  teams: {
    id: string;
    players: Player[];
  }[];
}

// Type for a single series state
export interface SeriesState {
  title: {
    nameShortened: string;
  };
  finished: boolean;
  teams: {
    id: string;
    score: number;
    players: Player[];
  }[];
  games: Game[];
}
export interface SeriesStateWithId extends SeriesState {
  id: number;
}
export interface FilterConfig {
  dateRange: DateRange;
  wins: boolean;
  losses: boolean;
  patch: string;
  championsPicked: { value: string; label: string }[];
  championsBanned: { value: string; label: string }[];
  teams: { value: string; label: string }[];
  players: { value: string; label: string }[];
}
// Type for the series details response
export interface SeriesDetailsResponse {
  data: {
    seriesState: SeriesState;
  };
}
function SidebarLoader(props: {
  setGameLoading: (gameLoading: boolean) => void;
  setSelectedGame: (id: string | null) => void;
  setScores: (scores: number[]) => void;
}) {
  const [seriesData, setSeriesData] = useState<any[]>([]);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [fetchedIds, setFetchedIds] = useState<number[]>([]);
  const [seriesDetails, setSeriesDetails] = useState<Record<
    string,
    SeriesState
  > | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const [filters, setFilters] = useState<FilterConfig | null>(null);
  const fetchFilters = () => {
    // Load filters from localStorage on mount
    const filterConfigStr = localStorage.getItem('filterConfig');
    if (filterConfigStr) {
      const filterConfig: FilterConfig = JSON.parse(filterConfigStr);
      setSeriesData([]);
      setSeriesDetails(null);
      setFilters(filterConfig);
      setFetchedIds([]);
      setHasMore(true);
    }
  };
  useEffect(() => {
    const handleFiltersUpdate = () => {
      fetchFilters();
      // Trigger re-fetch for series data
      fetchSeries();
    };
    handleFiltersUpdate();
    // Listen for `filtersUpdated` events
    window.addEventListener('filtersUpdated', handleFiltersUpdate);

    return () => {
      window.removeEventListener('filtersUpdated', handleFiltersUpdate);
    };
  }, []);

  const clearTokens = () => {
    localStorage.removeItem('getAuthToken()');
    localStorage.removeItem('refreshToken');
    document.location.reload();
  };
  const fetchSeries = async () => {
    console.log('fetchingSeries');
    if (!filters) return; // Wait for filters to load
    try {
      setIsFetching(true);
      console.log('fetch');

      const teamIds =
        filters.teams.length > 0
          ? filters.teams.map((team) => team.value)
          : undefined; // undefined means no filtering in GraphQL

      const livePlayerIds =
        filters.players.length > 0
          ? filters.players.map((player) => player.value)
          : undefined; // undefined means no filtering in GraphQL

      const windowStartTime =
        filters.dateRange?.from || new Date(2020, 0, 1).toISOString();
      const windowEndTime = filters.dateRange?.to || new Date().toISOString();

      const response = await fetch('https://api.grid.gg/central-data/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operationName: 'GetHistoricalSeries',
          variables: {
            ...graphqlVariables,
            after: endCursor,
            windowStartTime,
            windowEndTime,
            teamIds,
            livePlayerIds,
          },
          query: graphqlQuery,
        }),
      });
      if (response.status == 401) {
        setIsFetching(false);
        setHasMore(false);
        clearTokens();
        return;
      }
      if (!response.ok) {
        console.error(
          'Failed to fetch historical series:',
          response.statusText
        );
        setIsFetching(false);
        setHasMore(false);
        return;
      }

      const historicalData = await response.json();
      if (
        !(
          historicalData &&
          historicalData.data &&
          historicalData.data.allSeries
        )
      ) {
        console.error('Couldnt Get historical Data');
        setIsFetching(false);
        setHasMore(false);
        return;
      }

      const { edges: seriesEdges, pageInfo } = historicalData.data.allSeries;

      const seriesIds = seriesEdges.map(
        (edge: { node: { id: number } }) => edge.node.id
      );

      if (seriesIds.length === 0) {
        console.warn('No series found in the historical data.');
        setIsFetching(false);
        setHasMore(false);
        return;
      }

      // Fetch series details
      const seriesDetailsPromises = seriesIds.map(async (id: number) => {
        if (fetchedIds.includes(id)) {
          setIsFetching(false);
          setHasMore(false);
          return;
        }
        const detailResponse = await fetch(
          'https://api.grid.gg/live-data-feed/series-state/graphql',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${getAuthToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operationName: 'GetSeriesPlayersAndResults',
              variables: { id },
              query: `
                query GetSeriesPlayersAndResults($id: ID!) {
                  seriesState(id: $id) {
                    title {
                      nameShortened
                    }
                    finished
                    teams {
                      id
                      score
                      players {
                        id
                        name
                      }
                    }
                  }
                }
              `,
            }),
          }
        );
        if (detailResponse.status == 401) {
          return null;
        }

        if (!detailResponse.ok) {
          console.error(
            `Failed to fetch details for series ID ${id}:`,
            detailResponse.statusText
          );
          return null;
        }

        const data: SeriesDetailsResponse = await detailResponse.json();
        // Fetch game summary for champion filtering
        const gameSummaryResponse = await fetch(
          `https://api.grid.gg/file-download/end-state/riot/series/${id}/games/1/summary`,
          {
            headers: {
              Authorization: `Bearer ${getAuthToken()}`,
            },
          }
        );

        if (!gameSummaryResponse.ok) {
          console.error(
            `Failed to fetch game summary for series ID ${id}:`,
            gameSummaryResponse.statusText
          );
          return null;
        }

        const gameSummaryData = await gameSummaryResponse.json();
        const patch: string = gameSummaryData.gameVersion;
        const participants = gameSummaryData.participants as GameStats[];

        return {
          seriesState: { ...data.data.seriesState, id },
          participants,
          patch,
        };
      });
      const resolvedSeriesDetails: Array<{
        patch: string;
        participants: GameStats[];
        seriesState: SeriesStateWithId;
      } | null> = await Promise.all(seriesDetailsPromises);
      const validSeriesDetails = resolvedSeriesDetails.filter(
        (detail) => detail !== null
      );

      // Apply client-side filters
      var isEarlierPatch = false;
      const filteredSeriesDetails = validSeriesDetails.filter((detail) => {
        const { seriesState, participants, patch } = detail;
        if (filters.patch && !filters.patch.startsWith(patch)) {
          console.log(filters.patch, '+', patch);
          if (patch < filters.patch) {
            isEarlierPatch = true;
          }
          return false;
        }
        if (seriesState && seriesState.teams) {
          // Filter by wins/losses
          if (
            filters.wins &&
            !seriesState.teams.some((team) => team.score > 0)
          ) {
            return false;
          }
          if (
            filters.losses &&
            !seriesState.teams.some((team) => team.score === 0)
          ) {
            return false;
          }
        }
        // Filter by champions picked
        if (filters.championsPicked.length > 0) {
          const pickedChampionIds = filters.championsPicked.map((c) => c.label);
          const pickedInGame = participants.some((participant) =>
            pickedChampionIds.includes(participant.championName)
          );
          if (!pickedInGame) {
            return false;
          }
        }

        // Filter by champions banned (if available)
        if (filters.championsBanned.length > 0) {
          const bannedChampionIds = filters.championsBanned.map((c) => c.label);
          const bannedInGame = participants.some((participant) =>
            bannedChampionIds.includes(participant.championName)
          );
          if (!bannedInGame) {
            return false;
          }
        }

        return true;
      });
      if (isEarlierPatch) {
        setIsFetching(false);
        setHasMore(false);
        return;
      }
      // Update filtered series and details
      const filteredSeriesEdges = seriesEdges.filter((edge) =>
        filteredSeriesDetails.some(
          (detail) => detail.seriesState.id === edge.node.id
        )
      );

      setSeriesData((prevData) => [...prevData, ...filteredSeriesEdges]);
      setSeriesDetails((prevDetails) => ({
        ...prevDetails,
        ...Object.assign(
          {},
          ...filteredSeriesDetails.map((d) => ({
            [d.seriesState.id]: d.seriesState,
          }))
        ),
      }));

      setHasMore(pageInfo.hasNextPage);
      setEndCursor(pageInfo.endCursor);
      setFetchedIds((prev) => [...prev, ...seriesIds]);
      setIsFetching(false);
    } catch (error) {
      console.error('Error fetching series:', error);
      setIsFetching(false);
    }
  };

  return (
    <InfiniteScroll
      isLoading={isFetching}
      hasMore={hasMore}
      next={() => fetchSeries()}
      threshold={0}
    >
      {seriesDetails &&
        seriesData.map((edge) => {
          const { node } = edge;
          const teams = node.teams;
          const team1Score = seriesDetails[node.id]?.teams[0]?.score ?? 0;
          const team2Score = seriesDetails[node.id]?.teams[1]?.score ?? 0;
          return (
            <div
              className=' w-full border-b-2 text-accent flex-col flex justify-center items-center p-2 cursor-pointer hover:bg-slate-800'
              key={node.id}
              onClick={() => {
                props.setSelectedGame(node.id);
                props.setGameLoading(true);
                props.setScores([team1Score, team2Score]);
              }}
            >
              <div>
                {new Date(node.startTimeScheduled).toLocaleString('en', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </div>
              <div className='h-12 w-full text-accent flex justify-center items-center p-2 cursor-pointer hover:bg-slate-800'>
                <img
                  src={teams[0].baseInfo.logoUrl}
                  className='h-full'
                  alt='Team 1'
                />
                <div>
                  {team1Score} x {team2Score}
                </div>
                <img
                  src={teams[1].baseInfo.logoUrl}
                  className='h-full'
                  alt='Team 2'
                />
              </div>
            </div>
          );
        })}

      {isFetching && (
        <div className='h-12 w-full  text-accent flex justify-center items-center p-2'>
          <MoonLoader size={25} color='white' />
        </div>
      )}
    </InfiniteScroll>
  );
}

export default SidebarLoader;
