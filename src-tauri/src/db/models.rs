// src-tauri/db/models.rs

use super::schema::{event_logs, participants, series};
use diesel::{Insertable, Queryable, QueryableByName};
use serde::{Deserialize, Serialize};

#[derive(Queryable, Serialize, Deserialize, Debug)]
pub struct Series {
    pub id: i32,
    pub series_id: String,
    pub finished: bool,
    pub start_time_scheduled: Option<String>,
    pub patch: String,
    pub team1_id: Option<String>,
    pub team1_score: Option<i32>,   // Now in correct position
    pub team1_name: Option<String>, // Now in correct position
    pub team1_logo: Option<String>,
    pub team2_id: Option<String>,
    pub team2_score: Option<i32>,   // Now in correct position
    pub team2_name: Option<String>, // Now in correct position
    pub team2_logo: Option<String>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = series)]
pub struct NewSeries<'a> {
    pub series_id: &'a str,
    pub finished: bool,
    pub start_time_scheduled: Option<&'a str>,
    pub patch: Option<&'a str>,
    pub team1_id: Option<&'a str>,
    pub team1_name: Option<&'a str>,
    pub team1_score: Option<i32>,
    pub team1_logo: Option<&'a str>,
    pub team2_id: Option<&'a str>,
    pub team2_name: Option<&'a str>,
    pub team2_score: Option<i32>,
    pub team2_logo: Option<&'a str>,
}

#[derive(QueryableByName, Serialize, Deserialize, Debug)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))] // or diesel::pg::Pg for PostgreSQL
pub struct TeamInfoStruct {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub team_name: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub team_logo: Option<String>,
}

#[derive(Queryable, Serialize, Deserialize, Debug)]
pub struct Participant {
    pub id: i32,
    pub series_id: String,
    pub player_id: String,
    pub player_name: String,
    pub champion_name: String,
    pub stats_json: String, // Stores full stats as JSON
}

#[derive(Insertable, Debug)]
#[diesel(table_name = participants)]
pub struct NewParticipant {
    pub series_id: String,
    pub player_id: String,
    pub player_name: String,
    pub champion_name: String,
    pub stats_json: String, // Stores full stats as JSON
}

#[derive(Queryable, Serialize, Deserialize, Debug)]
pub struct EventLog {
    pub id: i32,
    pub series_id: String,
    pub event_log: String,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = event_logs)]
pub struct NewEventLog<'a> {
    pub series_id: &'a str,
    pub event_log: &'a str,
}
