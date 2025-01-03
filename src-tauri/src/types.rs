// src/types.rs (example location)
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DateRange {
    pub from: Option<String>,  // e.g. "2024-01-01T00:00:00.000Z"
    pub to: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChampionSelection {
    pub value: String,
    pub label: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TeamFilter {
    pub value: String,
    pub label: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlayerFilter {
    pub value: String,
    pub label: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FilterConfig {
    pub date_range: DateRange,
    pub wins: bool,
    pub losses: bool,
    pub patch: String,
    pub champions_picked: Vec<ChampionSelection>,
    pub champions_banned: Vec<ChampionSelection>,
    pub teams: Vec<TeamFilter>,
    pub players: Vec<PlayerFilter>,
}

// This is just an example. You’ll probably need to
// expand or refine these structs to match your needs.
