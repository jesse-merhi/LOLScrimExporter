// src/components/SidebarLoader.tsx

import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import MoonLoader from "react-spinners/MoonLoader";
import InfiniteScroll from "./ui/infinite-scroll";
import { FilterConfig, SeriesNode, FilteredSeriesResult } from "../lib/types";

interface SidebarLoaderProps {
  setGameLoading: (gameLoading: boolean) => void;
  setSelectedGame: (id: string | null) => void;
  setScores: (scores: number[]) => void;
}

const SidebarLoader: React.FC<SidebarLoaderProps> = (props) => {
  const [seriesData, setSeriesData] = useState<SeriesNode[]>([]);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState<FilterConfig | null>(null);
  const [authToken, setAuthToken] = useState<string>("");

  const [error, setError] = useState<string | null>(null);

  // Function to load filters from localStorage
  const loadFilters = () => {
    const filterConfigStr = localStorage.getItem("filterConfig");
    if (filterConfigStr) {
      try {
        const filterConfig: FilterConfig = JSON.parse(filterConfigStr);
        setFilters(filterConfig);
        setSeriesData([]);
        setEndCursor(null);
        setHasMore(true);
      } catch (err) {
        console.error("Failed to parse filterConfig from localStorage:", err);
        setError("Failed to load filters.");
      }
    } else {
      console.warn("No filterConfig found in localStorage.");
    }
  };

  // Function to get auth token
  const getAuthToken = () => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setAuthToken(token);
      return token;
    } else {
      console.error("No authToken found in localStorage.");
      setError("Authentication token missing.");
      return "";
    }
  };

  // Event listener for filtersUpdated event
  useEffect(() => {
    const handleFiltersUpdate = () => {
      loadFilters();
    };
    window.addEventListener("filtersUpdated", handleFiltersUpdate);
    return () => {
      window.removeEventListener("filtersUpdated", handleFiltersUpdate);
    };
  }, []);

  // On mount, load filters and auth token
  useEffect(() => {
    loadFilters();
    getAuthToken();
  }, []);

  // Fetch series when filters change
  useEffect(() => {
    if (filters) {
      fetchSeries();
    }
  }, [filters]);

  const clearTokens = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    document.location.reload();
  };

  const fetchSeries = async () => {
    if (!filters) return;
    if (!authToken) {
      console.error("Auth token is missing.");
      setError("Authentication token missing.");
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      console.log("PASSING CURSOR", endCursor);
      const response: FilteredSeriesResult = await invoke(
        "fetch_and_process_series",
        {
          filters,
          authToken,
          endCursor,
        }
      );
      console.log("NEW CURSOR", response.endCursor);

      setSeriesData((prevData) => [...prevData, ...response.filtered_series]);
      setHasMore(response.has_more);
      setEndCursor(response.endCursor);
    } catch (err) {
      console.error("Error fetching series data:", err);
      setError("Failed to fetch series data.");
      // Optionally, handle specific errors like unauthorized
      if (typeof err === "string" && err.includes("Unauthorized")) {
        clearTokens();
      }
    } finally {
      setIsFetching(false);
    }
  };
  console.log(seriesData);
  return (
    <InfiniteScroll
      isLoading={isFetching}
      hasMore={hasMore}
      next={fetchSeries}
      threshold={0}
    >
      {seriesData.length > 0
        ? seriesData.map((series) => {
            const { id, startTimeScheduled, teams } = series;
            const team1 = teams[0];
            const team2 = teams[1];
            const team1Score = team1.score ?? 0;
            const team2Score = team2.score ?? 0;

            return (
              <div
                className="w-full border-b-2 text-accent flex-col flex justify-center items-center p-2 cursor-pointer hover:bg-slate-800"
                key={id}
                onClick={() => {
                  props.setSelectedGame(id.toString());
                  props.setGameLoading(true);
                  props.setScores([team1Score, team2Score]);
                }}
              >
                <div>
                  {startTimeScheduled
                    ? new Date(startTimeScheduled).toLocaleString("en", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })
                    : "No Date"}
                </div>
                <div className="h-12 w-full text-accent flex justify-center items-center p-2 cursor-pointer hover:bg-slate-800">
                  {team1.baseInfo && (
                    <img
                      src={team1.baseInfo.logoUrl}
                      className="h-full"
                      alt="Team 1"
                    />
                  )}
                  <div>
                    {team1Score} x {team2Score}
                  </div>
                  {team2.baseInfo && (
                    <img
                      src={team2.baseInfo.logoUrl}
                      className="h-full"
                      alt="Team 2"
                    />
                  )}
                </div>
              </div>
            );
          })
        : !isFetching && <div>No series found.</div>}

      {isFetching && hasMore && (
        <div className="h-12 w-full text-accent flex justify-center items-center p-2">
          <MoonLoader size={25} color="white" />
        </div>
      )}

      {error && <div className="text-red-500">{error}</div>}
    </InfiniteScroll>
  );
};

export default SidebarLoader;
