import { GameStats } from "@/lib/types/gameStats";
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
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="w-[20%] h-full bg-blue-50">
        HERE IS WHERE THE Filters are
      </div>
      <div className="w-[80%] h-full bg-red-50">"HERE IS THE DISPLAY AREA"</div>
      {/* {JSON.stringify(gameSummary[0])} */}
    </div>
  );
}

export default Stats;
