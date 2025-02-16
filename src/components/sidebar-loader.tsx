import { fetchWithRetry, getBackoffDelay } from "@/lib/api";
import { graphqlQuery } from "@/lib/constants";
import { preloadChampionImages, preloadItemImages } from "@/lib/ddragon";
import { preloadTeamLogos } from "@/lib/grid";
import { GameStats } from "@/lib/types/gameStats";
import { clearTokens, getAuthToken } from "@/lib/utils";
import {
  InfiniteData,
  QueryFunctionContext,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import MoonLoader from "react-spinners/MoonLoader";
import InfiniteScroll from "./ui/infinite-scroll";

/* ---------------------------
   Types from your old code
---------------------------- */

export interface Player {
  id: string;
  name: string;
  character?: {
    id: string;
    name: string;
  };
}

export interface Game {
  teams: {
    id: string;
    players: Player[];
  }[];
}

export interface SeriesEdge {
  node: {
    id: number;
    /** So we can format dates: */
    startTimeScheduled?: string;
    /** So we can show logos: */
    teams?: {
      baseInfo: {
        logoUrl: string;
      };
    }[];
  };
}

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

/* --------------------------------
   Single-page shape for React Query
----------------------------------*/

interface DetailedSeries {
  seriesState: SeriesStateWithId;
  participants: GameStats[];
  patch: string;
}

/**
 * One page of data from the infinite query:
 * edges -> IDs from allSeries
 * details -> resolved + optionally filtered detail objects
 * pageInfo -> cursor info
 */
interface SidebarLoaderPage {
  edges: SeriesEdge[];
  details: DetailedSeries[];
  pageInfo: PageInfo;
}

/* --------------------------------
   SidebarLoader Props
----------------------------------*/

interface SidebarLoaderProps {
  setSelectedGame: (id: string | null) => void;
  setScores: (scores: number[]) => void;
  setSelectedPatch: (patch: string) => void;
  selectedGame: string | null;
}

/* --------------------------------
   Component
----------------------------------*/

function SidebarLoader({
  setSelectedGame,
  setScores,
  setSelectedPatch,
  selectedGame,
}: SidebarLoaderProps) {
  const [filters, setFilters] = useState<FilterConfig | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string>("");

  /** Load filter config on mount + whenever filtersUpdated event is fired */
  useEffect(() => {
    function loadFilters() {
      const filterConfigStr = localStorage.getItem("filterConfig");
      if (filterConfigStr) {
        try {
          setFilters(JSON.parse(filterConfigStr) as FilterConfig);
        } catch (err) {
          console.error("Failed to parse filterConfig:", err);
        }
      } else {
        console.warn("No filterConfig found in localStorage.");
      }
    }

    loadFilters();

    const handleFiltersUpdate = () => loadFilters();
    window.addEventListener("filtersUpdated", handleFiltersUpdate);
    return () => {
      window.removeEventListener("filtersUpdated", handleFiltersUpdate);
    };
  }, []);

  /**
   * Check if the detail object is valid
   */
  function isValidSeriesDetail(obj: any): obj is DetailedSeries {
    return obj && obj.seriesState && Array.isArray(obj.seriesState.teams);
  }

  /**
   * Fetch details for a single series ID
   */
  async function fetchSeriesDetail(id: number) {
    setLoadingStatus(`Fetching details for series ${id}...`);
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error("No auth token, please log in first.");
      }

      // 1) Fetch series state using fetchWithRetry with a retry callback:
      setLoadingStatus(`Fetching state for series ${id}...`);
      const seriesStateResp = await fetchWithRetry(
        "https://api.grid.gg/live-data-feed/series-state/graphql",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            operationName: "GetSeriesPlayersAndResults",
            variables: { id },
            query: `
              query GetSeriesPlayersAndResults($id: ID!) {
                seriesState(id: $id) {
                  title { nameShortened }
                  finished
                  teams {
                    id
                    score
                    players { id name }
                  }
                }
              }
            `,
          }),
        },
        0,
        (attempt, delay) => {
          // Update UI to show rate-limit information:
          setLoadingStatus(
            `Rate limited fetching state for series ${id}. Retrying attempt ${
              attempt + 1
            } in ${Math.ceil(delay / 1000)} seconds...`
          );
        }
      );

      if (!seriesStateResp.ok) {
        if (seriesStateResp.status === 401) {
          console.warn(`Unauthorized for series ID ${id}`);
          return null;
        }
        throw new Error(
          `Failed to fetch series state: ${seriesStateResp.statusText}`
        );
      }

      const seriesStateData: SeriesDetailsResponse =
        await seriesStateResp.json();

      // 2) Fetch game summary using fetchWithRetry with a similar callback:
      setLoadingStatus(`Fetching game summary for series ${id}...`);
      const gameSummaryResp = await fetchWithRetry(
        `https://api.grid.gg/file-download/end-state/riot/series/${id}/games/1/summary`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
        0,
        (attempt, delay) => {
          setLoadingStatus(
            `Rate limited fetching game summary for series ${id}. Retrying attempt ${
              attempt + 1
            } in ${Math.ceil(delay / 1000)} seconds...`
          );
        }
      );

      if (!gameSummaryResp.ok) {
        throw new Error(
          `Failed to fetch game summary: ${gameSummaryResp.statusText}`
        );
      }

      const gameSummaryData = await gameSummaryResp.json();
      let gamePatch = gameSummaryData.gameVersion?.trim();

      // 3) Fetch available patches (assume this one rarely hits 429)
      setLoadingStatus(`Fetching patch data for series ${id}...`);
      const patchResp = await fetch(
        "https://ddragon.leagueoflegends.com/api/versions.json"
      );
      if (!patchResp.ok) {
        throw new Error("Failed to fetch patch data");
      }
      const patchData: string[] = await patchResp.json();

      // 4) Validate the game patch and find the closest valid one
      let validPatch = "latest";
      if (gamePatch) {
        setLoadingStatus(`Validating patch version ${gamePatch}...`);
        validPatch = await findClosestPatch(gamePatch, patchData);
      } else {
        validPatch = patchData[0]; // Fallback to the latest patch
      }
      preloadChampionImages(validPatch);
      preloadItemImages(validPatch);

      return {
        seriesState: { ...seriesStateData.data.seriesState, id },
        participants: gameSummaryData.participants as GameStats[],
        patch: validPatch,
      };
    } catch (err) {
      console.error(`Error processing series ID ${id}:`, err);
      setLoadingStatus(
        `Failed to fetch series ${id}. Moving to next series...`
      );
      return null;
    }
  }

  /**
   * The main queryFn for useInfiniteQuery
   */
  async function queryFn(
    ctx: QueryFunctionContext<
      ["SidebarLoader", FilterConfig | null],
      string | null
    >
  ): Promise<SidebarLoaderPage> {
    setLoadingStatus("Fetching series list...");
    const [, currentFilters] = ctx.queryKey;
    const pageParam = ctx.pageParam ?? null;
    const authToken = getAuthToken();

    if (!authToken) throw new Error("No auth token, please log in first.");

    if (!currentFilters) {
      return {
        edges: [],
        details: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: "",
          endCursor: "",
        },
      };
    }

    const { teams, players, dateRange } = currentFilters;
    const teamIds = teams.map((t) => t.value);
    const playerIds = players.map((p) => p.value);
    const windowStartTime =
      dateRange?.from || new Date(2020, 0, 1).toISOString();
    const windowEndTime = dateRange?.to || new Date().toISOString();

    const variables: Record<string, any> = {
      types: ["SCRIM"],
      first: 5,
      after: pageParam,
      windowStartTime,
      windowEndTime,
    };
    if (teamIds.length) variables.teamIds = teamIds;
    if (playerIds.length) variables.livePlayerIds = playerIds;

    const response = await fetch("https://api.grid.gg/central-data/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operationName: "GetHistoricalSeries",
        variables,
        query: graphqlQuery,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) clearTokens();
      throw new Error(`Failed to fetch series: ${response.statusText}`);
    }

    const mainData: {
      data: {
        allSeries?: {
          edges: SeriesEdge[];
          pageInfo: PageInfo;
        };
      };
    } = await response.json();
    if (!mainData) {
      throw new Error(`Failed to fetch series: ${response.statusText}`);
    }

    const edges = mainData.data.allSeries?.edges || [];
    const pageInfo = mainData.data.allSeries?.pageInfo || {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: "",
      endCursor: "",
    };

    if (!edges.length) {
      setLoadingStatus("");
      return { edges: [], details: [], pageInfo };
    }

    setLoadingStatus(`Fetching details for ${edges.length} series...`);
    const seriesIds = edges.map((e) => e.node.id);
    const resolved = await Promise.all(seriesIds.map(fetchSeriesDetail));
    await Promise.all(
      edges.map((edge) => preloadTeamLogos(edge.node.teams || []))
    );

    const valid = resolved.filter(isValidSeriesDetail);

    const filteringNeeded =
      currentFilters.patch ||
      currentFilters.championsPicked.length ||
      currentFilters.championsBanned.length ||
      !currentFilters.wins ||
      !currentFilters.losses;

    let finalDetails: DetailedSeries[];
    if (filteringNeeded) {
      setLoadingStatus("Applying filters to series...");
      finalDetails = await invoke("filter_series", {
        seriesDetails: valid,
        filters: currentFilters,
        authToken,
      });
    } else {
      finalDetails = valid;
    }

    setLoadingStatus("");
    return { edges, details: finalDetails, pageInfo };
  }

  const {
    data,
    isFetching,
    isLoading,
    hasNextPage,
    fetchNextPage,
    error,
    failureCount,
  } = useInfiniteQuery<
    SidebarLoaderPage,
    Error,
    InfiniteData<SidebarLoaderPage>,
    ["SidebarLoader", FilterConfig | null],
    string | null
  >({
    queryKey: ["SidebarLoader", filters],
    queryFn,
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined,
    enabled: !!filters,
    retry: 30,
    staleTime: 60 * 60 * 5,
  });

  if (error) {
    return (
      <div className="h-20 w-full flex justify-center items-center text-gray-100">
        Error loading data: {error.message}
      </div>
    );
  }

  // Helper function to compare versions (used by findClosestPatch)
  function compareVersions(v1: string, v2: string): number {
    const normalize = (v: string) =>
      v
        .replace(/[^0-9.]/g, "")
        .split(".")
        .map(Number);
    const parts1 = normalize(v1);
    const parts2 = normalize(v2);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      if (part1 !== part2) {
        return part1 - part2;
      }
    }
    return 0;
  }

  async function findClosestPatch(
    targetPatch: string,
    availablePatches: string[]
  ): Promise<string> {
    if (availablePatches.includes(targetPatch)) {
      return targetPatch;
    }
    let closestPatch = availablePatches[0];
    let smallestDiff = Math.abs(
      compareVersions(targetPatch, availablePatches[0])
    );
    for (const patch of availablePatches) {
      const diff = Math.abs(compareVersions(targetPatch, patch));
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestPatch = patch;
      }
    }
    return closestPatch;
  }

  return (
    <InfiniteScroll
      isLoading={isFetching}
      hasMore={!!hasNextPage}
      next={fetchNextPage}
      stopDistance={3000} // Trigger next() only when within 200px
    >
      {isLoading ? (
        <div className="py-2 w-full flex flex-col justify-center items-center text-center gap-2">
          <MoonLoader size={25} color="white" />
          {loadingStatus && (
            <div className="text-sm text-accent text-gray-100">
              {loadingStatus}
            </div>
          )}
        </div>
      ) : (
        (() => {
          const pages = data?.pages || [];
          const allEdges = pages.flatMap((p) => p.edges);
          const allDetails = pages.flatMap((p) => p.details);

          if (!allEdges.length || !allDetails.length) {
            if (!isFetching)
              return (
                <div className="text-sm text-accent text-gray-100">
                  No series found.
                </div>
              );
            return null;
          }

          return allEdges.map((edge) => {
            const { node } = edge;
            const detail = allDetails.find((d) => d.seriesState.id === node.id);
            if (!detail) return null;

            const team1Score = detail.seriesState.teams[0]?.score ?? 0;
            const team2Score = detail.seriesState.teams[1]?.score ?? 0;
            const teams = node.teams || [];

            return (
              <div
                key={node.id}
                className={`w-full border-b-2 text-accent flex-col flex justify-center items-center p-2 cursor-pointer  ${
                  selectedGame == String(node.id)
                    ? "bg-slate-800"
                    : "hover:bg-slate-800"
                }`}
                onClick={async () => {
                  setSelectedGame(String(node.id));
                  setScores([team1Score, team2Score]);
                  if (detail.patch) {
                    setSelectedPatch(detail.patch);
                    setLoadingStatus(""); // Clear status
                  }
                }}
              >
                <div>
                  {node.startTimeScheduled
                    ? new Date(node.startTimeScheduled).toLocaleString("en", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })
                    : ""}
                </div>
                <div className="h-12 w-full text-accent flex justify-center items-center p-2 cursor-pointer">
                  {teams[0]?.baseInfo?.logoUrl && (
                    <img
                      src={teams[0].baseInfo.logoUrl}
                      className="h-full"
                      alt="Team 1"
                    />
                  )}
                  <div>
                    {team1Score} x {team2Score}
                  </div>
                  {teams[1]?.baseInfo?.logoUrl && (
                    <img
                      src={teams[1].baseInfo.logoUrl}
                      className="h-full"
                      alt="Team 2"
                    />
                  )}
                </div>
              </div>
            );
          });
        })()
      )}
      {isFetching && hasNextPage && (
        <div className="py-2 w-full flex flex-col justify-center items-center text-center gap-2">
          <MoonLoader size={25} color="white" />
          {loadingStatus && (
            <div className="text-sm text-accent text-gray-100">
              {loadingStatus}
            </div>
          )}
          {failureCount > 0 && (
            <div className="text-sm text-yellow-300">
              Retrying... Attempt {failureCount} of 3. Waiting roughly{" "}
              {Math.ceil(getBackoffDelay(failureCount) / 1000)} seconds.
            </div>
          )}
        </div>
      )}
    </InfiniteScroll>
  );
}

export default SidebarLoader;
