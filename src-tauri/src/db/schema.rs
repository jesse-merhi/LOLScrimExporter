// src-tauri/db/schema.rs

use diesel::allow_tables_to_appear_in_same_query;
use diesel::table;

// src-tauri/db/schema.rs

table! {
    series (id) {
        id -> Integer,
        series_id -> Text,              // Unique series identifier from grid.gg
        finished -> Bool,               // Whether the series is finished
        start_time_scheduled -> Nullable<Text>, // ISO string for scheduled start time
        patch -> Text,                  // Game patch version
        team1_id -> Nullable<Text>,
        team1_score -> Nullable<Integer>,
        team1_name -> Nullable<Text>,
        team1_logo -> Nullable<Text>,
        team2_id -> Nullable<Text>,
        team2_score -> Nullable<Integer>,
        team2_name -> Nullable<Text>,
        team2_logo -> Nullable<Text>,
    }
}

table! {
    participants (id) {
        id -> Integer,
        series_id -> Text,
        player_id -> Text,
        player_name -> Text,
        champion_name -> Text,
        stats_json -> Text, // Add stats_json column
    }
}

table! {
    event_logs (id) {
        id -> Integer,
        series_id -> Text,  // Foreign key to series.series_id
        event_log -> Text,  // Entire event log (JSON string)
    }
}

allow_tables_to_appear_in_same_query!(series, participants, event_logs);
