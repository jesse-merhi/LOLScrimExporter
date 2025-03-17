import { Champion } from "@/lib/types/champions";
import { GameStats } from "@/lib/types/gameStats";
import { getAuthToken } from "@/lib/utils";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Download } from "lucide-react";
import { useState } from "react";
import MoonLoader from "react-spinners/MoonLoader";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { preloadChampionImages, preloadItemImages } from "@/lib/ddragon";
import { Participant } from "@/lib/types/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

function Summary({
  participants,
  scores,
  champions,
  patch,
  gameId,
}: {
  participants: Participant[];
  scores: number[];
  patch: string;
  champions: Record<string, Champion>;
  gameId: string;
}) {
  const [loading, setLoading] = useState(false);
  useSuspenseQuery({
    queryKey: ["championImages", patch, participants],
    queryFn: () => preloadChampionImages(patch, participants),
  });

  useSuspenseQuery({
    queryKey: ["itemImages", patch, participants],
    queryFn: () => preloadItemImages(patch, participants),
  });
  const downloadFile = async () => {
    const authToken = getAuthToken();
    if (!authToken) {
      console.error("No auth token, please log in first.");
      return <></>;
    }

    try {
      const filePath = await save({
        defaultPath: `game-${gameId}.rofl`,
        filters: [
          {
            name: "Replay Files",
            extensions: ["rofl"],
          },
        ],
      });

      if (!filePath) {
        return; // User cancelled the dialog
      }

      setLoading(true);

      const response = await fetch(
        `https://api.grid.gg/file-download/replay/riot/series/${gameId}/games/1`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      await writeFile(filePath, buffer);
      toast.success("File downloaded and saved successfully!");
    } catch (error) {
      console.error("Failed to download file:", error);
      toast.error("Failed to download file.");
    } finally {
      setLoading(false);
    }
  };

  const copyGameId = async () => {
    try {
      await navigator.clipboard.writeText(gameId);
      toast.info("Game ID copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy game ID:", error);
      toast.error("Failed to copy Game ID.");
    }
  };
  return (
    <div className="w-full h-full">
      <ToastContainer />
      <ScrollArea className="overflow y-auto px-4 w-full h-full">
        <div className="font-semibold w-full text-center">Patch {patch}</div>
        {participants ? (
          participants.map((player, index) => {
            const stats = JSON.parse(player.stats_json);
            return (
              <div className="w-full " key={index}>
                {index === 0 && (
                  <div className="flex-row flex items-center my-2">
                    <h1 className="text-lg font-semibold">Blue Team</h1>{" "}
                    {scores[0] > scores[1] ? (
                      <h1 className="text-lg ml-2 px-2 py-[1px] rounded-md font-semibold bg-blue-500 text-white">
                        Victory
                      </h1>
                    ) : (
                      <h1 className="text-lg ml-2 px-2 py-[1px] rounded-md font-semibold bg-red-500 text-white">
                        Defeat
                      </h1>
                    )}
                  </div>
                )}
                <div className="mb-2 flex justify-between items-center flex-row ">
                  <div className="w-[30%] flex flex-row justify-start items-center">
                    <img
                      className="h-10 w-10"
                      src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${
                        champions[player.champion_name].image.full
                      }`}
                    />
                    <h1 className="px-3 text-xl w-[18%] text-center">
                      {stats.champLevel}
                    </h1>
                    <div className="flex items-start justify-center flex-col">
                      <div className="font-semibold">
                        {stats.riotIdGameName}
                      </div>
                      <div>{champions[player.champion_name].name}</div>
                    </div>
                  </div>
                  <div className="w-[15%] justify-center items-center text-center">
                    <div>
                      {stats.kills}/{stats.deaths}/{stats.assists}
                    </div>
                  </div>
                  <div className="flex items-center justify-center flex-row">
                    {[0, 1, 2, 3, 4, 5]
                      .map(
                        (item) =>
                          (stats[
                            ("item" + item) as keyof GameStats
                          ] as number) ?? 0
                      )
                      .sort((a, b) => b - a)
                      .map((item) =>
                        item ? (
                          <img
                            className="h-10 w-10"
                            src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${item}.png`}
                          />
                        ) : (
                          <div className="border-y-2 border-l-2 border-slate-500 h-10 w-10"></div>
                        )
                      )}
                    {stats.item6 ? (
                      <img
                        className="h-10 w-10"
                        src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${stats.item6}.png`}
                      />
                    ) : (
                      <div className="border-2 border-slate-500 h-10 w-10"></div>
                    )}
                  </div>
                  <div className="w-[10%] items-center justify-center flex">
                    {stats.totalMinionsKilled} cs
                  </div>
                  <div className="w-[10%] items-center justify-center flex">
                    {parseInt(stats.goldEarned).toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                    g
                  </div>
                </div>
                {index === 4 && (
                  <div className="flex-row flex items-center">
                    <Separator className="my-4 " />
                  </div>
                )}
                {index === 4 && (
                  <div className="flex-row flex items-center my-2">
                    <h1 className="text-lg font-semibold">Red Team</h1>
                    {scores[1] > scores[0] ? (
                      <h1 className="text-lg ml-2 px-2 py-[1px] rounded-md font-semibold bg-blue-500 text-white">
                        Victory
                      </h1>
                    ) : (
                      <h1 className="text-lg ml-2 px-2 py-[1px] rounded-md font-semibold bg-red-500 text-white">
                        Defeat
                      </h1>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div>No Game Data Found</div>
        )}
        <div className="w-full items-center justify-between flex h-auto pb-4">
          <button
            onClick={downloadFile}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center text-center"
            disabled={loading}
          >
            {loading ? (
              <MoonLoader size={15} color="white" />
            ) : (
              <>
                <Download size={15} /> <div>ROFL</div>
              </>
            )}
          </button>
          <div
            className="text-gray-400 cursor-pointer"
            onClick={copyGameId}
            title="Click to copy"
          >
            gameid:{gameId}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default Summary;
