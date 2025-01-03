// src/lib/types.ts

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface ChampionSelection {
  value: string;
  label: string;
}

export interface TeamFilter {
  value: string;
  label: string;
}

export interface PlayerFilter {
  value: string;
  label: string;
}

export interface FilterConfig {
  dateRange: DateRange;
  wins: boolean;
  losses: boolean;
  patch: string;
  championsPicked: ChampionSelection[];
  championsBanned: ChampionSelection[];
  teams: TeamFilter[];
  players: PlayerFilter[];
}

export interface SeriesNode {
  id: number;
  startTimeScheduled: string | null;
  teams: TeamInfo[];
}

export interface TeamInfo {
  id: string;
  score: number | null;
  baseInfo?: BaseInfo;
}

export interface BaseInfo {
  logoUrl: string;
}

export interface FilteredSeriesResult {
  filtered_series: SeriesNode[];
  has_more: boolean;
  endCursor: string;
}
