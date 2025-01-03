import { GameStats, gameStatsKeys } from "@/lib/types/gameStats";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "./ui/scroll-area";
import { useEffect, useState } from "react";
import { Champion } from "@/lib/types/champions";
import MoonLoader from "react-spinners/MoonLoader";
function Stats({
  gameSummary,
  patch,
}: {
  gameSummary: GameStats[];
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
    <ScrollArea className="h-full rounded-md border w-full">
      <Table className="w-full overflow-auto">
        <TableHeader className="sticky top-0 z-[100] bg-gray-100">
          <TableRow className="">
            <TableHead className="w-[100px] ">
              <div className="flex items-end justify-start pb-2 h-full w-full">
                Stat
              </div>
            </TableHead>
            {gameSummary.map((player, index) => (
              <TableHead
                className={
                  index == 4 ? "border-l-gray-200 border-r-2  p-2" : "p-2"
                }
              >
                <div className="flex flex-col text-center items-center justify-center">
                  <img
                    className="h-10 w-10"
                    src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${
                      champions[player.championName].image.full
                    }`}
                  />
                  {player.riotIdGameName}
                  <br />
                  {player.championName}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="">
          {gameStatsKeys.map((stat: keyof GameStats) => (
            <TableRow>
              <TableCell className="font-medium">
                {camelCaseToSentence(stat)}
              </TableCell>
              {gameSummary.map((player, index) => (
                <TableCell
                  className={
                    index == 4
                      ? "border-l-gray-200 border-r-2 text-center"
                      : " text-center"
                  }
                >
                  {parseInt(player[stat] as string).toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

export default Stats;
