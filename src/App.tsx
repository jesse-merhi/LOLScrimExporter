import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { Suspense, useEffect, useState } from "react";
import MoonLoader from "react-spinners/MoonLoader";
import "./App.css";
import AppErrorBoundary from "./components/AppErrorBoundary";
import Draft, { DraftLog } from "./components/draft";
import Filter from "./components/filter";
import {
  default as Loader,
  default as LoadingPage,
} from "./components/LoadingPage";
import Login from "./components/login";
import SidebarLoader from "./components/sidebar-loader";
import Stats from "./components/stats";
import Summary from "./components/summary";
import { Button } from "./components/ui/button";
import { fetchChampionData, findClosestPatch } from "./lib/ddragon";
import { Participant } from "./lib/types/types";
import { authIsExpired, getAuthToken, getRefreshToken } from "./lib/utils";

function App() {
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedPatch, setSelectedPatch] = useState<string>("");
  const [selectedGame, setSelectedGame] = useState<null | string>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
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

  const { data: patches } = useQuery({
    queryKey: ["versions", participants],
    queryFn: async () => {
      const response = await fetch(
        "https://ddragon.leagueoflegends.com/api/versions.json"
      );

      const data = await response.json();
      return data;
    },
  });

  const closestPatch = findClosestPatch(selectedPatch, patches);

  // --- Champion Data Query ---
  const { data: champions } = useQuery({
    queryKey: ["championsSummary", closestPatch],
    queryFn: () => fetchChampionData(closestPatch),
    enabled: !!selectedPatch && !!patches,
    retry: true,
  });

  // --- Event Log Query ---
  const { data: eventLog } = useQuery({
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

  if (!reloadKey && (!getAuthToken() || authIsExpired())) {
    return <Login setReloadKey={setReloadKey} />;
  }

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
            <AppErrorBoundary>
              <Suspense fallback={<Loader />}>
                <SidebarLoader
                  selectedGame={selectedGame}
                  setSelectedGame={setSelectedGame}
                  setScores={setScores}
                  setSelectedPatch={setSelectedPatch}
                  setParticipants={setParticipants}
                />
              </Suspense>
            </AppErrorBoundary>
          </div>
          <Button
            onClick={logout}
            className="h-[10%] w-full text-xl flex items-center justify-center border-t-2 border-foreground bg-foreground hover:bg-gray-900"
          >
            Log Out
          </Button>
        </div>
        <AppErrorBoundary>
          <Suspense fallback={<LoadingPage />}>
            <div className="h-full w-[80%] pt-4">
              {selectedGame && champions && champions.data ? (
                <Tabs className="h-full w-full" defaultValue="summary">
                  <TabsList className="h-auto grid w-full grid-cols-3">
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="stats">Stats</TabsTrigger>
                    <TabsTrigger value="draft">Draft</TabsTrigger>
                  </TabsList>
                  <TabsContent value="summary" className="w-full h-[95%]">
                    <Summary
                      champions={champions.data}
                      participants={participants}
                      patch={closestPatch}
                      scores={scores}
                      gameId={selectedGame}
                    />
                  </TabsContent>
                  <TabsContent value="stats" className="h-[95%] w-full">
                    <Stats participants={participants} patch={closestPatch} />
                  </TabsContent>
                  <TabsContent value="draft" className="h-[95%] w-full">
                    <Draft
                      eventLog={eventLog ?? []}
                      patch={closestPatch}
                      champions={champions.data}
                    />
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="h-full w-full text-lg font-semibold flex justify-center items-center">
                  Pick a game on the side to view its details.
                </div>
              )}
            </div>
          </Suspense>
        </AppErrorBoundary>
      </div>
    </main>
  );
}

export default App;
