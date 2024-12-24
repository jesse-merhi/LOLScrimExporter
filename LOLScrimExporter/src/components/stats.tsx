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
/*
damageDealtToObjectives: 6854,
damageDealtToTurrets: 5291,
detectorWardsPlaced: 4,
largestKillingSpree: 3,
largestMultiKill: 2,
magicDamageDealt: 2263,
magicDamageDealtToChampions: 1494,
magicDamageTaken: 14419,
physicalDamageDealt: 82485,
physicalDamageDealtToChampions: 8328,
physicalDamageTaken: 18520,
totalAllyJungleMinionsKilled: 1,
totalDamageDealt: 104451,
totalDamageDealtToChampions: 9876,
totalDamageShieldedOnTeammates: 0,
totalDamageTaken: 36408,
totalEnemyJungleMinionsKilled: 0,
totalHeal: 6474,
turretKills: 2,
turretTakedowns: 4,
visionScore: 36,
visionWardsBoughtInGame: 4,
wardsKilled: 9,
wardsPlaced: 13,
https://opgg-static.akamaized.net/meta/images/lol/latest/perk/8008.png
perks: {
    statPerks: {
    defense: 5011,
    flex: 5008,
    offense: 5005
    },
    styles: [
        {
        description: "primaryStyle",
        selections: [
            {
                perk: 8005,
                var1: 915,
                var2: 915,
                var3: 0
                },
                {
                perk: 9101,
                var1: 989,
                var2: 0,
                var3: 0
                },
                {
                perk: 9105,
                var1: 25,
                var2: 10,
                var3: 0
                },
                {
                perk: 8299,
                var1: 531,
                var2: 0,
                var3: 0
                }
            ],
            style: 8000
            },
            {
            description: "subStyle",
            selections: [
                {
                perk: 8444,
                var1: 1596,
                var2: 0,
                var3: 0
                },
                {
                perk: 8451,
                var1: 231,
                var2: 0,
                var3: 0
                }
            ],
            style: 8400
            }
    ]
},

*/
function Stats({ gameSummary }: { gameSummary: GameStats[] }) {
  function camelCaseToSentence(input: string): string {
    return input
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Insert space before capital letters
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // Handle consecutive capitals
      .replace(/^./, (str) => str.toUpperCase()); // Capitalize the first letter
  }
  return (
    <ScrollArea className="h-full rounded-md border">
      <Table>
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
                    src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${player.championName}.png`}
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
