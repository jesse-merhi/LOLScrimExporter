import { FilterConfig } from "@/lib/types";
import {
  DetailedSeries,
  PageInfo,
  Participant,
  SeriesEdge,
  SeriesWithParticipants,
} from "@/lib/types/types";
import { getAuthToken } from "@/lib/utils";
import {
  QueryFunctionContext,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

/**
 * One page of data from the infinite query:
 * edges -> IDs from allSeries
 * details -> resolved + optionally filtered detail objects
 * pageInfo -> cursor info
 */
export interface SidebarLoaderPage {
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
  setParticipants: (participants: Participant[]) => void;
}

/* --------------------------------
   Component
----------------------------------*/

function SidebarLoader({
  setSelectedGame,
  setScores,
  setSelectedPatch,
  selectedGame,
  setParticipants,
}: SidebarLoaderProps) {
  const [filters, setFilters] = useState<FilterConfig | null>(null);

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
   * The main queryFn for useInfiniteQuery
   */
  async function queryFn(
    ctx: QueryFunctionContext<["SidebarLoader", FilterConfig | null]>
  ): Promise<SeriesWithParticipants[]> {
    const [, currentFilters] = ctx.queryKey;
    const authToken = getAuthToken();

    if (!authToken) throw new Error("No auth token, please log in first.");

    if (!currentFilters) {
      return [];
    }

    return await invoke("get_series_with_participants", {
      filters: currentFilters,
      authToken: authToken,
    });
  }

  async function start_sync() {
    const TEN_MINUTES = 10 * 60 * 1000;
    const now = Date.now();
    const lastSyncStr = localStorage.getItem("lastSync");

    if (lastSyncStr && now - parseInt(lastSyncStr, 10) < TEN_MINUTES) {
      console.log(
        "Sync was triggered less than 10 minutes ago; skipping sync."
      );
      return null;
    }

    // Update the timestamp and trigger the sync.
    localStorage.setItem("lastSync", now.toString());
    await invoke("start_sync", {
      authToken: getAuthToken(),
    });
    return null;
  }

  const { data } = useSuspenseQuery({
    queryKey: ["SidebarLoader", filters],
    queryFn,
    retry: true,
    staleTime: 5,
  });

  useQuery({
    queryKey: ["startSync", data],
    queryFn: start_sync,
    // Only run this if filters are set and the main data returns empty.
    enabled: data !== undefined && data.length === 0,
    retry: false,
  });

  return (
    <>
      {data.map((edge) => {
        const series = edge.series;
        const series_id = series.series_id;
        const team1Score = series.team1_score || 0;
        const team2Score = series.team2_score || 0;
        const patch = series.patch;
        const startTimeScheduled = series.start_time_scheduled;
        const team1_logo = series.team1_logo;
        const team2_logo = series.team2_logo;
        const participants = edge.participants;

        return (
          <div
            key={series_id}
            className={`w-full border-b-2 text-accent flex-col flex justify-center items-center p-2 cursor-pointer  ${
              selectedGame == series_id ? "bg-slate-800" : "hover:bg-slate-800"
            }`}
            onClick={async () => {
              setSelectedGame(String(series_id));
              setParticipants(participants.slice(0, 10));
              setScores([team1Score, team2Score]);
              if (patch) {
                setSelectedPatch(patch);
              }
            }}
          >
            <div>
              {startTimeScheduled
                ? new Date(startTimeScheduled).toLocaleString("en", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })
                : "no time"}
            </div>
            <div className="h-12 w-full text-accent flex justify-center items-center p-2 cursor-pointer">
              {team1_logo && (
                <img src={team1_logo} className="h-full" alt="Team 1" />
              )}
              <div>
                {team1Score} x {team2Score}
              </div>
              {team2_logo && (
                <img src={team2_logo} className="h-full" alt="Team 2" />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default SidebarLoader;
