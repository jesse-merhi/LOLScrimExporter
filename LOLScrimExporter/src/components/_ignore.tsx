import { graphqlQuery, graphqlVariables } from '@/lib/constants';
import { GameStats } from '@/lib/types/gameStats';
import { getAuthToken } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';
import MoonLoader from 'react-spinners/MoonLoader';
import InfiniteScroll from './ui/infinite-scroll';

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

export interface SeriesEdge {
  node: {
    id: number;
  };
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

export interface MyOrg {
  id: string;
  name: string;
  userCount: number;
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
export interface PageInfo {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  startCursor: string;
  endCursor: string;
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
  const fetchFilters = async () => {
    console.log('Fetching Filters');
    // Load filters from localStorage on mount
    const filterConfigStr = localStorage.getItem('filterConfig');
    if (filterConfigStr) {
      const filterConfig: FilterConfig = JSON.parse(filterConfigStr);
      setSeriesData([]);
      setSeriesDetails(null);
      setFilters(filterConfig);
      setFetchedIds([]);
      setHasMore(true);
      setEndCursor(null);
    }
  };
  useEffect(() => {
    const handleFiltersUpdate = async () => {
      console.log('HERE');
      await fetchFilters();
      // Trigger re-fetch for series data
      fetchSeries();
    };
    window.addEventListener('filtersUpdated', handleFiltersUpdate);

    return () => {
      window.removeEventListener('filtersUpdated', handleFiltersUpdate);
    };
  }, []);

  useEffect(() => {
    // Only run once, on mount
    fetchFilters();
  }, []);

  // Separate effect that runs again when 'filters' changes from null to something valid
  useEffect(() => {
    if (filters) {
      fetchSeries();
    }
  }, [filters]);

  const clearTokens = () => {
    localStorage.removeItem('getAuthToken()');
    localStorage.removeItem('refreshToken');
    document.location.reload();
  };
  const fetchSeries = async () => {
    if (!filters) return; // Wait for filters to load
    try {
      setIsFetching(true);
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
        console.error(
          'Failed to fetch historical series:',
          response.statusText
        );
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
        console.error('Couldnt Get historical Data', historicalData);
        setIsFetching(false);
        setHasMore(false);
        return;
      }

      const {
        edges: seriesEdges,
        pageInfo,
      }: { edges: SeriesEdge[]; pageInfo: PageInfo } =
        historicalData.data.allSeries;

      const seriesIds = seriesEdges.map((edge) => edge.node.id);

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
      const resolvedSeriesDetails: Array<
        | {
            patch: string;
            participants: GameStats[];
            seriesState: SeriesStateWithId;
          }
        | null
        | undefined
      > = await Promise.all(seriesDetailsPromises);
      const validSeriesDetails = resolvedSeriesDetails.filter(
        (detail) => detail !== null && detail !== undefined
      );

      // Apply client-side filters
      var isEarlierPatch = false;

      async function fetchTeamsByName(name: string) {
        const url = 'https://api.grid.gg/central-data/graphql';
        const requestBody = {
          operationName: 'GetTeamsFilter',
          variables: {
            first: 50,
            name: { contains: name },
          },
          query: `
            query GetTeamsFilter($name: StringFilter, $first: Int) {
              teams(filter: { name: $name }, first: $first) {
                edges {
                  node {
                    id
                    name
                    logoUrl
                  }
                }
              }
            }
          `,
        };

        try {
          const authToken = getAuthToken();
          if (!authToken) {
            console.error('No auth token, please log in first.');
            return [];
          }

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(requestBody),
          });

          const json = await response.json();
          const edges = json?.data?.teams?.edges || [];
          return edges.map((edge: any) => ({
            label: edge.node.name,
            value: edge.node.id,
            logoUrl: edge.node.logoUrl,
          }));
        } catch (error) {
          console.error('Error fetching Teams:', error);
          return [];
        }
      }

      // Modify fetchSeries to use fetchTeamsByName for fetching team ID
      const teamResponse = await fetch(
        'https://lol.grid.gg/api/organisations/mine',
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );
      const teamData: MyOrg = await teamResponse.json();
      const myteam = teamData.name;

      // Fetch team ID for myteam
      const teamsByName = await fetchTeamsByName(myteam);
      let myteamId: string;
      if (teamsByName.length > 0) {
        myteamId = teamsByName[0].value;
      }
      const filteredSeriesDetails = validSeriesDetails.filter((detail) => {
        const { seriesState, participants, patch } = detail;
        console.log('HERE');
        if (filters.patch && !patch.startsWith(filters.patch)) {
          if (patch < filters.patch) {
            isEarlierPatch = true;
          }
          console.log('Filtered Out Not In Current Patch');
          return false;
        }
        if (seriesState && seriesState.teams) {
          const team1 = seriesState.teams[0];
          const team2 = seriesState.teams[1];

          const isTeam1 = team1.id === myteamId;
          const isTeam2 = team2.id === myteamId;

          // Determine if my team won or lost
          const myTeamWon =
            (isTeam1 && team1.score >= team2.score) ||
            (isTeam2 && team2.score >= team1.score);
          const myTeamLost =
            (isTeam1 && team1.score <= team2.score) ||
            (isTeam2 && team2.score <= team1.score);

          // Check filters for wins, losses, or both
          const showWins = filters.wins && myTeamWon;
          const showLosses = filters.losses && myTeamLost;

          if (!(showWins || showLosses)) {
            console.log(showWins, showLosses);
            console.log('Filtered Out Not in Wins/Losses');
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
            console.log('Filtered Out Champion Not Picked');
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
            console.log('Filtered Out Champion Not Banned');
            return false;
          }
        }
        console.log('Not Filtered: ', detail);
        return true;
      });

      if (isEarlierPatch && filteredSeriesDetails.length == 0) {
        setIsFetching(false);
        setHasMore(false);
        console.log('Earlier Patch Exiting Early');
        return;
      }
      // Update filtered series and details
      const filteredSeriesEdges = seriesEdges.filter((edge) =>
        filteredSeriesDetails.some(
          (detail) => detail.seriesState.id === edge.node.id
        )
      );

      setSeriesData((prevData) => {
        const existingIds = new Set(prevData.map((item) => item.id)); // Assuming `id` uniquely identifies each game
        const newItems = filteredSeriesEdges.filter(
          (item) => !existingIds.has(item.node.id)
        );
        return [...prevData, ...newItems];
      });

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
      {seriesDetails
        ? seriesData.map((edge) => {
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
          })
        : !isFetching && <>Test</>}

      {hasMore && (
        <div className='h-12 w-full  text-accent flex justify-center items-center p-2'>
          <MoonLoader size={25} color='white' />
        </div>
      )}
    </InfiniteScroll>
  );
}

export default SidebarLoader;
