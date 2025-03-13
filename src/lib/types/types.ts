import { DateRange } from "../types";
import { GameStats } from "./gameStats";

export interface Participant {
    id: number;
    series_id: string;
    player_id: string;
    player_name: string;
    champion_name: string;
    stats_json: string;
}

export interface Series {
    id: number;
    series_id: string;
    finished: boolean;
    start_time_scheduled: string | null;
    patch: string;
    team1_id: string | null;
    team1_name: string | null;
    team1_score: number | null;
    team1_logo: string | null;
    team2_id: string | null;
    team2_name: string | null;
    team2_score: number | null;
    team2_logo: string | null;
}

export interface SeriesWithParticipants {
    series: Series;
    participants: Participant[];
}
export interface Player {
    id: string;
    name: string;
    character?: {
        id: string;
        name: string;
    };
}

export interface Game {
    teams: {
        id: string;
        players: Player[];
    }[];
}

export interface SeriesEdge {
    node: {
        id: number;
        /** So we can format dates: */
        startTimeScheduled?: string;
        /** So we can show logos: */
        teams?: {
            baseInfo: {
                logoUrl: string;
            };
        }[];
    };
}

export interface SeriesState {
    title: {
        nameShortened: string;
    };
    finished: boolean;
    teams: {
        id: string;
        score: number;
        players: Player[];
    }[];
    patch: string;
    games: Game[];
}

export interface SeriesStateWithId extends SeriesState {
    id: number;
}

export interface FilterConfig {
    dateRange: DateRange;
    wins: boolean;
    losses: boolean;
    patch: string;
    championsPicked: { value: string; label: string }[];
    championsBanned: { value: string; label: string }[];
    teams: { value: string; label: string }[];
    players: { value: string; label: string }[];
}

export interface SeriesDetailsResponse {
    data: {
        seriesState: SeriesState;
    };
}

export interface PageInfo {
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    startCursor: string;
    endCursor: string;
}

/* --------------------------------
   Single-page shape for React Query
----------------------------------*/

export interface DetailedSeries {
    seriesState: SeriesStateWithId;
    participants: GameStats[];
    patch: string;
}


