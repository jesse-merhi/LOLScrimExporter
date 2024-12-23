import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import MoonLoader from "react-spinners/MoonLoader";
import "./App.css";
import Draft from "./components/draft";
import Filter from "./components/filter";
import Login from "./components/login";
import SidebarLoader, { SeriesState } from "./components/sidebar-loader";
import Stats from "./components/stats";
import Summary from "./components/summary";
import { Button } from "./components/ui/button";
import { getAuthToken, getRefreshToken } from "./lib/utils";
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
  const [seriesDetails, setSeriesDetails] = useState<Record<
    string,
    SeriesState
  > | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [gameLoading, setGameLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<null | string>(null);
  const [scores, setScores] = useState<number[]>([0, 0]);

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
    if (selectedGame) {
      fetchGameSummary();
    }
  }, [selectedGame]);
  if (!reloadKey && !getAuthToken()) {
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
              <TabsContent
                value="summary"
                className="bg-blue-50  w-full  h-[95%]"
              >
                <Summary gameSummary={gameSummary} scores={scores} />
              </TabsContent>
              <TabsContent value="stats" className="h-[95%] w-full">
                <Stats gameSummary={gameSummary} />
              </TabsContent>
              <TabsContent value="draft" className="h-full w-full">
                <Draft selectedGame={selectedGame} />
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
