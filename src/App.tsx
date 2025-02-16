import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect, useState } from "react";
import MoonLoader from "react-spinners/MoonLoader";
import "./App.css";
import Draft, { DraftLog } from "./components/draft";
import Filter from "./components/filter";
import Login from "./components/login";
import SidebarLoader from "./components/sidebar-loader";
import Stats from "./components/stats";
import Summary from "./components/summary";
import { Button } from "./components/ui/button";
import { getBackoffDelay } from "./lib/api";
import { fetchChampionData } from "./lib/ddragon";
import { authIsExpired, getAuthToken, getRefreshToken } from "./lib/utils";

const MAX_RETRIES = 10;

function App() {
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedPatch, setSelectedPatch] = useState<string>("");
  const [selectedGame, setSelectedGame] = useState<null | string>(null);
  const [scores, setScores] = useState<number[]>([0, 0]);
  const [update, setUpdate] = useState<any>(null);

  const clearTokens = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    document.location.reload();
  };

  const logout = async () => {
    try {
      const authToken = getAuthToken();
      const refreshToken = getRefreshToken();
      await invoke("logout", { authToken, refreshToken });
      clearTokens();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // --- Game Summary Query ---
  const {
    data: gameSummary,
    isLoading: gameLoading,
    failureCount,
  } = useQuery({
    queryKey: ["gameSummary", selectedGame],
    queryFn: async () => {
      if (!selectedGame) return [];
      const authToken = getAuthToken();
      if (!authToken) throw new Error("No auth token, please log in first.");
      const url = `https://api.grid.gg/file-download/end-state/riot/series/${selectedGame}/games/1/summary`;
      const options: RequestInit = {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      };
      const response = await fetch(url, options);
      if (!response.ok) throw new Error("Failed to fetch game summary");
      const data = await response.json();
      return data.participants;
    },
    retry: MAX_RETRIES,
    enabled: !!selectedGame,
  });

  // --- Champion Data Query ---
  const {
    data: championJson,
    isLoading: isLoadingChampions,
    isError: isChampionError,
    error: championError,
  } = useQuery({
    queryKey: ["championsSummary", selectedPatch],
    queryFn: () => fetchChampionData(selectedPatch),
    enabled: !!selectedPatch,
    retry: true,
  });

  // --- Event Log Query ---
  const {
    data: eventLog,
    isLoading: isEventLogLoading,
    error: eventLogError,
    failureCount: eventLogFailureCount,
  } = useQuery({
    queryKey: ["eventLog", selectedGame],
    queryFn: async () => {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error("No auth token, please log in first.");
      }
      const url = "https://lol.grid.gg/api/event-explorer-api/events/graphql";
      const options: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          operationName: "getSeriesEvents",
          variables: {
            id: selectedGame,
            filter: {
              event: [
                { type: { eq: "team-banned-character" } },
                { type: { eq: "team-picked-character" } },
                { type: { eq: "grid-validated-series" } },
              ],
            },
          },
          query: `query getSeriesEvents($id: String!, $filter: EventsFilter, $after: Cursor) {
            events(seriesId: $id, filter: $filter, after: $after) {
              edges {
                node {
                  type
                  sentenceChunks {
                    text
                    strikethrough
                  }
                }
              }
            }
          }`,
        }),
      };
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error("Request failed: " + response.statusText);
      }
      const data = await response.json();
      return data.data.events.edges as DraftLog[];
    },
    enabled: !!selectedGame,
    retry: 3,
  });

  const checkForUpdates = async () => {
    const update = await check();
    if (update) {
      let downloaded = 0;
      let contentLength = 0;
      update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            setUpdate({ downloaded, contentLength });
            break;
          case "Finished":
            setUpdate(null);
            break;
        }
      });
      await relaunch();
    }
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

  // --- Combined Error Handling ---
  const combinedError = eventLogError || championError;
  if (combinedError) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <p className="text-lg text-red-500">
          Error loading data: {(combinedError as Error).message}
        </p>
      </div>
    );
  }

  if (!reloadKey && (!getAuthToken() || authIsExpired())) {
    return <Login setReloadKey={setReloadKey} />;
  }

  // --- Champion Loading Spinner ---
  if (isLoadingChampions) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center">
        <MoonLoader size={40} color="#fff" />
        <div className="mt-4 text-lg text-gray-800">Loading champions...</div>
      </div>
    );
  }

  const champions = championJson?.data;
  if (update) {
    return (
      <div className="h-screen w-screen flex items-center justify-center flex-col">
        <div className="flex flex-col items-center">
          <div className="text-2xl mb-4">Updating</div>
          <MoonLoader />
          <div className="text-lg mt-4">
            Downloaded {update.downloaded} of {update.contentLength} bytes
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="h-screen w-screen bg-primary-foreground">
      <div className="h-full w-full flex flex-row">
        <div className="h-full w-[20%] bg-primary">
          <Filter />
          <div className="h-[80%] overflow-y-scroll no-scrollbar px-4">
            <SidebarLoader
              selectedGame={selectedGame}
              setSelectedGame={setSelectedGame}
              setScores={setScores}
              setSelectedPatch={setSelectedPatch}
            />
          </div>
          <Button
            onClick={logout}
            className="h-[10%] w-full text-xl flex items-center justify-center border-t-2 border-foreground bg-foreground hover:bg-gray-900"
          >
            Log Out
          </Button>
        </div>
        <div className="h-full w-[80%] py-4">
          {gameLoading && selectedGame ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <MoonLoader />
              <div className="mt-4 text-lg text-gray-800">
                {failureCount > 0
                  ? `Rate Limited... attempting ${failureCount} of ${MAX_RETRIES}. Retrying in ${Math.ceil(
                      getBackoffDelay(failureCount) / 1000
                    )} seconds.`
                  : "Loading game summary..."}
              </div>
            </div>
          ) : selectedGame ? (
            <Tabs className="h-full w-full" defaultValue="summary">
              <TabsList className="h-auto grid w-full grid-cols-3">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="w-full h-[95%]">
                <Summary
                  champions={champions}
                  gameSummary={gameSummary}
                  patch={selectedPatch}
                  scores={scores}
                  gameId={selectedGame}
                />
              </TabsContent>
              <TabsContent value="stats" className="h-[95%] w-full">
                <Stats gameSummary={gameSummary} patch={selectedPatch} />
              </TabsContent>
              <TabsContent value="draft" className="h-[95%] w-full">
                {isEventLogLoading ? (
                  <div className="h-full w-full flex flex-col items-center justify-center">
                    <MoonLoader size={40} />
                    <div className="mt-4 text-lg text-gray-800">
                      {eventLogFailureCount > 0 &&
                        `Retrying... Attempt ${eventLogFailureCount} of 3. Waiting roughly ${Math.ceil(
                          getBackoffDelay(eventLogFailureCount) / 1000
                        )} seconds.`}
                    </div>
                  </div>
                ) : (
                  <Draft
                    eventLog={eventLog ?? []}
                    patch={selectedPatch}
                    champions={champions}
                  />
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="h-full w-full text-lg font-semibold flex justify-center items-center">
              Pick a game on the side to view its details.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
