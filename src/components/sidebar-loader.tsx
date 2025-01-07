import { graphqlQuery } from "@/lib/constants";
import { GameStats } from "@/lib/types/gameStats";
import { clearTokens, getAuthToken } from "@/lib/utils";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import MoonLoader from "react-spinners/MoonLoader";
import InfiniteScroll from "./ui/infinite-scroll";
import { invoke } from "@tauri-apps/api/core";

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
  patch: string;
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
  setSelectedPatch: (patch: string) => void;
}) {
  const [seriesData, setSeriesData] = useState<any[]>([]);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [fetchStage, setFetchStage] = useState<string>("");
  const [seriesDetails, setSeriesDetails] = useState<Record<
    string,
    SeriesState
  > | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const [filters, setFilters] = useState<FilterConfig | null>(null);

  const loadFilters = () => {
    const filterConfigStr = localStorage.getItem("filterConfig");
    if (filterConfigStr) {
      try {
        const filterConfig: FilterConfig = JSON.parse(filterConfigStr);
        setFilters(filterConfig);
        setSeriesData([]);
        setSeriesDetails(null);
        setEndCursor(null);
        setHasMore(true);
      } catch (err) {
        console.error("Failed to parse filterConfig from localStorage:", err);
      }
    } else {
      console.warn("No filterConfig found in localStorage.");
    }
  };
  // Event listener for filtersUpdated event
  useEffect(() => {
    const handleFiltersUpdate = () => {
      loadFilters();
    };
    if (!filters) loadFilters();
    window.addEventListener("filtersUpdated", handleFiltersUpdate);
    return () => {
      window.removeEventListener("filtersUpdated", handleFiltersUpdate);
    };
  }, []);

  // Fetch series when filters change
  useEffect(() => {
    if (filters) {
      fetchSeries();
    }
  }, [filters]);
  function isValidSeriesDetail(detail: any): detail is SeriesStateWithId {
    return (
      detail !== null &&
      detail !== undefined &&
      typeof detail.seriesState === "object" && // Ensure seriesState is an object
      typeof detail.seriesState.teams === "object" // Ensure teams is present
    );
  }

  const fetchSeries = async () => {
    if (!filters) return;

    try {
      setIsFetching(true);
      setFetchStage("Fetching series...");
      console.log("Fetching series");
      const { teams, players, dateRange } = filters;
      const teamIds = teams.map((team) => team.value) || null;
      const livePlayerIds = players.map((player) => player.value) || null;
      const windowStartTime =
        dateRange?.from || new Date(2020, 0, 1).toISOString();
      const windowEndTime = dateRange?.to || new Date().toISOString();
      const variables: {
        types: string[];
        first: number;
        after: string | null;
        windowStartTime: string | Date;
        windowEndTime: string | Date;
        teamIds?: string[];
        livePlayerIds?: string[];
      } = {
        types: ["SCRIM"],
        first: 5,
        after: endCursor,
        windowStartTime,
        windowEndTime,
      };
      if (teamIds.length > 0) {
        variables["teamIds"] = teamIds;
      }
      if (livePlayerIds.length > 0) {
        variables["livePlayerIds"] = livePlayerIds;
      }

      console.log("Fetching series", variables);
      const response = await fetch("https://api.grid.gg/central-data/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operationName: "GetHistoricalSeries",
          variables,
          query: graphqlQuery,
        }),
      });

      if (!response.ok) {
        handleErrorResponse(response);
        return;
      }

      const historicalData: {
        data: {
          allSeries: {
            edges: SeriesEdge[];
            pageInfo: PageInfo;
          };
        };
      } = await response.json();
      const { edges: seriesEdges, pageInfo } =
        historicalData.data?.allSeries || {};
      if (!seriesEdges?.length) {
        console.log("No series found.");
        setHasMore(false);
        setIsFetching(false);
        return;
      }
      setFetchStage("Fetching details...");
      const allGameIds = seriesEdges.map((edge) => edge.node.id);
      const resolvedSeriesDetails = await fetchSeriesDetails(allGameIds);

      if (!resolvedSeriesDetails) {
        console.error("Failed to fetch series details.", resolvedSeriesDetails);
        setHasMore(false);
        setIsFetching(false);
        return;
      }
      const validSeriesDetails = resolvedSeriesDetails.filter((detail) =>
        isValidSeriesDetail(detail)
      );
      setFetchStage("Applying filters...");
      console.log(validSeriesDetails);
      let filteredSeriesDetails: {
        seriesState: SeriesStateWithId;
        participants: GameStats[];
        patch: string;
      }[];
      if (
        filters.patch ||
        filters.championsPicked.length ||
        filters.championsBanned.length ||
        !filters.wins ||
        !filters.losses
      ) {
        filteredSeriesDetails = await invoke("filter_series", {
          seriesDetails: validSeriesDetails,
          filters,
          authToken: getAuthToken(),
        });
      } else {
        filteredSeriesDetails = validSeriesDetails;
      }

      updateSeriesData(seriesEdges, filteredSeriesDetails, pageInfo);
    } catch (error) {
      console.error("Error fetching series:", error);
      setIsFetching(false);
    }
  };
  const handleErrorResponse = (response: Response) => {
    console.error("Failed to fetch:", response.statusText);
    if (response.status === 401) clearTokens();
    setHasMore(false);
    setIsFetching(false);
  };

  const fetchSeriesDetails = async (allGameIds: number[]) => {
    return await Promise.all(createSeriesDetailsPromises(allGameIds));
  };

  const updateSeriesData = (
    seriesEdges: SeriesEdge[],
    filteredSeriesDetails: any[],
    pageInfo: PageInfo
  ) => {
    console.log("Series Edges", seriesEdges);
    console.log("Filtered Series Details", filteredSeriesDetails);
    console.log("Page Info", pageInfo);
    if (filteredSeriesDetails.length) {
      setSeriesData((prevData) => {
        const existingIds = new Set(prevData.map((item) => item.node.id));
        const newItems = seriesEdges.filter(
          (item) =>
            !existingIds.has(item.node.id) &&
            filteredSeriesDetails.some(
              (detail) => detail.seriesState.id === item.node.id
            )
        );
        return [...prevData, ...newItems];
      });

      setSeriesDetails((prevDetails) => {
        const newDetails = Object.fromEntries(
          filteredSeriesDetails.map((detail) => [
            detail.seriesState.id,
            detail.seriesState,
          ])
        );
        return { ...prevDetails, ...newDetails };
      });
    }

    setHasMore(pageInfo.hasNextPage);
    setEndCursor(pageInfo.endCursor);
    setIsFetching(false);
  };
  function createSeriesDetailsPromises(allGameIds: number[]) {
    return allGameIds.map(async (id: number) => {
      try {
        // Fetch series state
        const seriesStateResponse = await fetch(
          "https://api.grid.gg/live-data-feed/series-state/graphql",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${getAuthToken()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              operationName: "GetSeriesPlayersAndResults",
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

        if (!seriesStateResponse.ok) {
          if (seriesStateResponse.status === 401) {
            console.warn(`Unauthorized access for series ID ${id}`);
            return null;
          }
          console.error(
            `Failed to fetch series state for ID ${id}:`,
            seriesStateResponse.statusText
          );
          return null;
        }

        const seriesStateData: SeriesDetailsResponse =
          await seriesStateResponse.json();

        // Fetch game summary
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

        return {
          seriesState: { ...seriesStateData.data.seriesState, id },
          participants: gameSummaryData.participants as GameStats[],
          patch: gameSummaryData.gameVersion,
        };
      } catch (error) {
        console.error(`Error processing series ID ${id}:`, error);
        return null;
      }
    });
  }

  return (
    <InfiniteScroll
      isLoading={isFetching}
      hasMore={hasMore}
      next={fetchSeries}
      threshold={0}
    >
      {seriesDetails && seriesData.length > 0
        ? seriesData.map((edge) => {
            const { node } = edge;
            const teams = node.teams;
            const team1Score = seriesDetails[node.id]?.teams[0]?.score ?? 0;
            const team2Score = seriesDetails[node.id]?.teams[1]?.score ?? 0;
            return (
              <div
                className=" w-full border-b-2 text-accent flex-col flex justify-center items-center p-2 cursor-pointer hover:bg-slate-800"
                key={node.id}
                onClick={() => {
                  console.log("Selected game:", node.id);
                  props.setSelectedGame(node.id);
                  props.setGameLoading(true);
                  props.setScores([team1Score, team2Score]);
                  if (seriesDetails[node.id].patch) {
                    props.setSelectedPatch(seriesDetails[node.id].patch);
                  } else {
                    fetch(
                      "https://ddragon.leagueoflegends.com/api/versions.json"
                    )
                      .then((response) => response.json())
                      .then((patchData) => {
                        props.setSelectedPatch(patchData[0]);
                      })
                      .catch((error) => {
                        console.error("Failed to fetch patch data:", error);
                      });
                  }
                }}
              >
                <div>
                  {new Date(node.startTimeScheduled).toLocaleString("en", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </div>
                <div className="h-12 w-full text-accent flex justify-center items-center p-2 cursor-pointer hover:bg-slate-800">
                  <img
                    src={teams[0].baseInfo.logoUrl}
                    className="h-full"
                    alt="Team 1"
                  />
                  <div>
                    {team1Score} x {team2Score}
                  </div>
                  <img
                    src={teams[1].baseInfo.logoUrl}
                    className="h-full"
                    alt="Team 2"
                  />
                </div>
              </div>
            );
          })
        : !isFetching && <div>No series found.</div>}

      {isFetching && hasMore && (
        <div className="h-20 w-full text-accent flex justify-center items-center p-2 flex items-center justify-center flex-col ">
          <div>
            <MoonLoader size={25} color="white" />
          </div>
          <p className="text-sm mt-2 text-center">{fetchStage}</p>
        </div>
      )}
    </InfiniteScroll>
  );
}

export default SidebarLoader;
