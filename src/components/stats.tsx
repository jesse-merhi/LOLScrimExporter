import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Champion } from "@/lib/types/champions";
import { GameStats, gameStatsKeys } from "@/lib/types/gameStats";
import { Participant } from "@/lib/types/types";
import { useEffect, useState } from "react";
import MoonLoader from "react-spinners/MoonLoader";
import { ScrollArea } from "./ui/scroll-area";

function Stats({
  participants,
  patch,
}: {
  participants: Participant[];
  patch: string;
}) {
  const [champions, setChampions] = useState<Record<string, Champion> | null>(
    null
  );
  useEffect(() => {
    const fetchChamps = async () => {
      const response = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${patch}/data/en_US/champion.json`
      );
      const champs = await response.json();
      setChampions(champs.data);
    };
    fetchChamps();
  }, [patch]);

  function camelCaseToSentence(input: string): string {
    return input
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Insert space before capital letters
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // Handle consecutive capitals
      .replace(/^./, (str) => str.toUpperCase()); // Capitalize the first letter
  }
  if (!champions) {
    return <MoonLoader size={25} color="white" />;
  }
  return (
    <ScrollArea className="border w-full overflow-auto h-full">
      <Table>
        <TableHeader className="sticky top-0 z-[100] bg-gray-100">
          <TableRow className="h-auto">
            <TableHead className="w-[100px] ">
              <div className="flex items-end justify-start pb-2 h-full w-full">
                Stat
              </div>
            </TableHead>
            {participants.map((player, index) => {
              const stats = JSON.parse(player.stats_json);
              return (
                <TableHead
                  className={
                    index == 4 ? "border-l-gray-200 border-r-2  p-2" : "p-2"
                  }
                >
                  <div className="flex flex-col text-center items-center justify-between h-full">
                    <div>
                      <img
                        className="w-10 h-10 md:h-12 md:w-12 xl:h-14 xl:w-14"
                        src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${
                          champions[player.champion_name].image.full
                        }`}
                      />
                    </div>
                    <div>{stats.riotIdGameName}</div>
                    <div>{player.champion_name}</div>
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody className="">
          {gameStatsKeys.map((stat: keyof GameStats) => (
            <TableRow>
              <TableCell className="font-medium">
                {camelCaseToSentence(stat)}
              </TableCell>
              {participants.map((player, index) => {
                const stats = JSON.parse(player.stats_json);
                return (
                  <TableCell
                    className={
                      index == 4
                        ? "border-l-gray-200 border-r-2 text-center"
                        : " text-center"
                    }
                  >
                    {parseInt(stats[stat] as string).toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

export default Stats;
