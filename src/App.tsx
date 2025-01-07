import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import MoonLoader from "react-spinners/MoonLoader";
import "./App.css";
import Draft from "./components/draft";
import Filter from "./components/filter";
import Login from "./components/login";
import SidebarLoader from "./components/sidebar-loader";
import Stats from "./components/stats";
import Summary from "./components/summary";
import { Button } from "./components/ui/button";
import { authIsExpired, getAuthToken, getRefreshToken } from "./lib/utils";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { set } from "date-fns";
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
/// https://developer.riotgames.com/docs/lol#data-dragon
// https://ddragon.leagueoflegends.com/cdn/14.24.1/data/en_US/champion.json

function App() {
  const [gameSummary, setGameSummary] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedPatch, setSelectedPatch] = useState<string>("");
  const [gameLoading, setGameLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<null | string>(null);
  const [scores, setScores] = useState<number[]>([0, 0]);
  const [update, setUpdate] = useState<any>(null);

  // Helper functions to manage localStorage
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
      console.log("Logout successful");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const fetchGameSummary = async () => {
    const authToken = getAuthToken();
    if (!authToken) {
      console.error("No auth token, please log in first.");
      return;
    }

    const response = await fetch(
      `https://api.grid.gg/file-download/end-state/riot/series/${selectedGame}/games/1/summary`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      setGameSummary([]);
      setGameLoading(false);
      return;
    }

    const data = await response.json();
    setGameSummary(data.participants);
    setGameLoading(false);
  };

  useEffect(() => {
    if (selectedGame !== null) {
      fetchGameSummary();
    }
  }, [selectedGame]);
  console.log(authIsExpired());

  const checkForUpdates = async () => {
    const update = await check();
    if (update) {
      console.log(
        `found update ${update.version} from ${update.date} with notes ${update.body}`
      );
      let downloaded = 0;
      let contentLength = 0;
      // alternatively we could also call update.download() and update.install() separately
      update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            console.log(
              `started downloading ${event.data.contentLength} bytes`
            );
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            console.log(`downloaded ${downloaded} from ${contentLength}`);
            setUpdate({
              downloaded,
              contentLength,
            });
            break;
          case "Finished":
            console.log("download finished");
            setUpdate(null);
            break;
        }
      });

      console.log("update installed");
      await relaunch();
    }
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

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
  if (!reloadKey && (!getAuthToken() || authIsExpired())) {
    return <Login setReloadKey={setReloadKey} />;
  }

  return (
    <main className="h-screen w-screen bg-primary-foreground">
      {/* Sidebar and Main Content Layout */}
      <div className="h-full w-full flex flex-row">
        {/* Sidebar */}

        <div className="h-[full] w-[20%] bg-primary">
          <Filter />
          <div className="h-[80%] overflow-y-scroll no-scrollbar px-4">
            <SidebarLoader
              setGameLoading={setGameLoading}
              setSelectedGame={setSelectedGame}
              setScores={setScores}
              setSelectedPatch={setSelectedPatch}
            />
          </div>
          <Button
            onClick={logout}
            className="h-[10%] w-full text-xl flex items-center justify-center border-t-2 border-foreground bg-foreground hover:bg-gray-900 "
          >
            Log Out
          </Button>
        </div>
        <div className="h-full w-[80%] py-4">
          {gameLoading && selectedGame ? (
            <div className="w-full h-full items-center flex justify-center">
              <MoonLoader />
            </div>
          ) : selectedGame ? (
            <Tabs className="h-full w-full" defaultValue="summary">
              <TabsList className="h-[5%] grid w-full grid-cols-3">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="w-full  h-[95%]">
                <Summary
                  gameSummary={gameSummary}
                  patch={selectedPatch}
                  scores={scores}
                  gameId={selectedGame}
                />
              </TabsContent>
              <TabsContent value="stats" className="h-[95%] w-full">
                <Stats gameSummary={gameSummary} patch={selectedPatch} />
              </TabsContent>
              <TabsContent value="draft" className="h-full w-full">
                <Draft selectedGame={selectedGame} patch={selectedPatch} />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="h-full w-full text-lg font-semibold flex justify-center items-center">
              Pick a game on the side to view its details.{" "}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
