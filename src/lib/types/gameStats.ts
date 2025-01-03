export interface PerkSelection {
  perk: number;
}

export interface PerkStyle {
  description: string;
  selections: PerkSelection[];
  style: number;
}

export interface StatPerks {
  defense: number;
  flex: number;
  offense: number;
}

export interface Perks {
  statPerks: StatPerks;
  styles: PerkStyle[];
}

export interface GameStats {
  damageDealtToObjectives: number;
  damageDealtToTurrets: number;
  detectorWardsPlaced: number;
  largestKillingSpree: number;
  largestMultiKill: number;
  magicDamageDealt: number;
  magicDamageDealtToChampions: number;
  magicDamageTaken: number;
  physicalDamageDealt: number;
  physicalDamageDealtToChampions: number;
  physicalDamageTaken: number;
  totalAllyJungleMinionsKilled: number;
  totalDamageDealt: number;
  totalDamageDealtToChampions: number;
  totalDamageShieldedOnTeammates: number;
  totalDamageTaken: number;
  totalEnemyJungleMinionsKilled: number;
  totalHeal: number;
  turretKills: number;
  turretTakedowns: number;
  visionScore: number;
  visionWardsBoughtInGame: number;
  wardsKilled: number;
  wardsPlaced: number;
  perks: Perks;
  champLevel: number;
  riotIdGameName: string;
  kills: number;
  deaths: number;
  assists: number;
  championName: string;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  item0: number;
  totalMinionsKilled: number;
  goldEarned: string;
}

type GameStatsKeys = keyof GameStats;

// Create an array of all keys
export const gameStatsKeys: GameStatsKeys[] = [
  'damageDealtToObjectives',
  'damageDealtToTurrets',
  'detectorWardsPlaced',
  'largestKillingSpree',
  'largestMultiKill',
  'magicDamageDealt',
  'magicDamageDealtToChampions',
  'magicDamageTaken',
  'physicalDamageDealt',
  'physicalDamageDealtToChampions',
  'physicalDamageTaken',
  'totalAllyJungleMinionsKilled',
  'totalDamageDealt',
  'totalDamageDealtToChampions',
  'totalDamageShieldedOnTeammates',
  'totalDamageTaken',
  'totalEnemyJungleMinionsKilled',
  'totalHeal',
  'turretKills',
  'turretTakedowns',
  'visionScore',
  'visionWardsBoughtInGame',
  'wardsKilled',
  'wardsPlaced',
];
