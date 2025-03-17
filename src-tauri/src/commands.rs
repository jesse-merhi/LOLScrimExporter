// src/commands.rs
use crate::db;
use crate::db::models::{Participant, Series, TeamInfoStruct};
use crate::db::schema::participants::dsl::{participants, series_id as participant_series_id};
use crate::db::schema::participants::player_name;
use crate::db::schema::series::dsl::series;
use crate::sync::sync_once;
use diesel::prelude::*;
use log::{error, info, warn};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::command;
use tokio::time::sleep;

// ==============================
// Filter Configuration Types
// ==============================

#[derive(Debug, Serialize, Deserialize)]
pub struct DateRange {
    pub from: Option<String>, // e.g., "2024-01-01T00:00:00.000Z"
    pub to: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChampionSelection {
    pub value: String,
    pub label: String,
    pub champ: String,
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
pub enum Modes {
    Any,
    Only,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FilterConfig {
    #[serde(rename = "dateRange")]
    pub date_range: DateRange,
    pub wins: bool,
    pub losses: bool,
    pub patch: String,
    #[serde(rename = "championsPicked")]
    pub champions_picked: Vec<ChampionSelection>,
    #[serde(rename = "champPickedMode")]
    pub champ_picked_mode: Modes,
    #[serde(rename = "championsBanned")]
    pub champions_banned: Vec<ChampionSelection>,
    #[serde(rename = "champBannedMode")]
    pub champ_banned_mode: Modes,
    pub teams: Vec<TeamFilter>,
    pub players: Vec<PlayerFilter>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameSummary {
    #[serde(rename = "gameVersion")]
    pub game_version: String,
    pub participants: Vec<GameStats>,
}

// ==============================
// Series Data Types
// ==============================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Player {
    pub id: String,
    pub name: String,
    pub character: Option<Character>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Character {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TeamInfo {
    #[serde(rename = "baseInfo")]
    pub base_info: Option<BaseInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BaseInfo {
    #[serde(rename = "logoUrl")]
    pub logo_url: String,
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SeriesNode {
    pub id: String,
    #[serde(rename = "startTimeScheduled")]
    pub start_time_scheduled: Option<String>,
    pub teams: Vec<TeamInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SeriesEdge {
    pub node: SeriesNode,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageInfo {
    #[serde(rename = "hasNextPage")]
    pub has_next_page: bool,
    #[serde(rename = "endCursor")]
    pub end_cursor: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AllSeries {
    pub edges: Vec<SeriesEdge>,
    #[serde(rename = "pageInfo")]
    pub page_info: PageInfo,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeriesState {
    pub finished: bool,
    pub teams: Vec<SeriesTeam>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeriesStateWithId {
    pub id: String,
    pub finished: bool,
    pub teams: Vec<SeriesTeam>,
    #[serde(rename = "startTimeScheduled")]
    pub start_time_scheduled: Option<String>,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeriesTeam {
    pub id: String,
    pub score: i64,
    pub players: Vec<Player>,
    #[serde(rename = "base_info")]
    pub base_info: Option<BaseInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Game {
    pub teams: Vec<GameTeam>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameTeam {
    pub id: String,
    pub players: Vec<Player>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameStats {
    // pub damageDealtToObjectives: i64,
    // pub damageDealtToTurrets: i64,
    // pub detectorWardsPlaced: i64,
    // pub largestKillingSpree: i64,
    // pub largestMultiKill: i64,
    // pub magicDamageDealt: i64,
    // pub magicDamageDealtToChampions: i64,
    // pub magicDamageTaken: i64,
    // pub physicalDamageDealt: i64,
    // pub physicalDamageDealtToChampions: i64,
    // pub physicalDamageTaken: i64,
    // pub totalAllyJungleMinionsKilled: i64,
    // pub totalDamageDealt: i64,
    // pub totalDamageDealtToChampions: i64,
    // pub totalDamageShieldedOnTeammates: i64,
    // pub totalDamageTaken: i64,
    // pub totalEnemyJungleMinionsKilled: i64,
    // pub totalHeal: i64,
    // pub turretKills: i64,
    // pub turretTakedowns: i64,
    // pub visionScore: i64,
    // pub visionWardsBoughtInGame: i64,
    // pub wardsKilled: i64,
    // pub wardsPlaced: i64,
    // pub perks: Perks, Removed because unused.
    // pub champLevel: i64,
    // pub riotIdGameName: String,
    // pub kills: i64,
    // pub deaths: i64,
    // pub assists: i64,
    #[serde(rename = "championName")]
    pub champion_name: String,
    // pub item1: i64,
    // pub item2: i64,
    // pub item3: i64,
    // pub item4: i64,
    // pub item5: i64,
    // pub item6: i64,
    // pub item0: i64,
    // pub totalMinionsKilled: i64,
    // pub goldEarned: i64,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct MyOrg {
    pub id: String,
    pub name: String,
    // pub userCount: i64, unused so removing.
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TeamNode {
    pub node: TeamInfoShort,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TeamInfoShort {
    pub id: String,
    pub name: String,
    #[serde(rename = "logoUrl")]
    pub logo_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TeamsFilterResponse {
    pub data: TeamsFilterData,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TeamsFilterData {
    pub teams: TeamsFilterTeams,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TeamsFilterTeams {
    pub edges: Vec<TeamNode>,
}

// ==============================
// Final Filtered Result Types
// ==============================

#[derive(Debug, Serialize, Deserialize)]
pub struct FilteredSeriesResult {
    pub filtered_series: Vec<SeriesStateWithId>,
    pub has_more: bool,
    #[serde(rename = "endCursor")]
    pub end_cursor: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FilteredSeriesDetail {
    // Make sure series_state -> seriesState
    #[serde(rename = "seriesState")]
    pub series_state: SeriesStateWithId,
    pub participants: Vec<GameStats>,
    pub patch: String,
}

pub async fn get_my_team_id(auth_token: String) -> Result<String, String> {
    let client = Client::new();
    let org_response = client
        .get("https://lol.grid.gg/api/organisations/mine")
        .header("Authorization", format!("Bearer {}", auth_token))
        .send()
        .await
        .map_err(|err| {
            error!("Failed to fetch organization info: {}", err);
            format!("Failed to fetch organization info: {}", err)
        })?;
    let my_org: MyOrg = match org_response.json().await {
        Ok(data) => {
            info!("Successfully parsed organization info: {:?}", data);
            data
        }
        Err(err) => {
            error!("Failed to parse organization info: {}", err);
            return Err(format!("Failed to parse organization info: {}", err));
        }
    };
    let my_team_name = my_org.name;
    info!("User's team name: {}", my_team_name);

    // Fetch team ID by name
    let team_id_response = client
        .post("https://api.grid.gg/central-data/graphql")
        .header("Authorization", format!("Bearer {}", auth_token))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "operationName": "GetTeamsFilter",
            "variables": {
                "name": { "contains": my_team_name }
            },
            "query": r#"
            query GetTeamsFilter($name: StringFilter) {
                teams(filter: { name: $name }) {
                    edges {
                        node {
                            id
                            name
                            logoUrl
                        }
                    }
                }
            }
            "#
        }))
        .send()
        .await
        .map_err(|err| {
            error!(
                "Failed to fetch team ID by name '{}': {}",
                my_team_name, err
            );
            format!(
                "Failed to fetch team ID by name '{}': {}",
                my_team_name, err
            )
        })?;
    let team_id_response_json: TeamsFilterResponse = match team_id_response.json().await {
        Ok(data) => {
            info!("Successfully parsed team ID response");
            data
        }
        Err(err) => {
            error!("Failed to parse team ID response: {}", err);
            return Err(format!("Failed to parse team ID response: {}", err));
        }
    };
    let teams: Vec<TeamInfoShort> = team_id_response_json
        .data
        .teams
        .edges
        .into_iter()
        .map(|edge| edge.node)
        .collect();
    if teams.is_empty() {
        warn!("No teams found matching the name '{}'", my_team_name);
        return Err(format!(
            "No teams found matching the name '{}'",
            my_team_name
        ));
    }
    let team_id = teams[0].id.clone();
    info!("Found team ID: {}", team_id);
    Ok(team_id.to_string())
}

#[command]
pub async fn get_games() -> Result<Vec<Series>, String> {
    let mut connection = db::establish_db_connection();
    series
        .load::<Series>(&mut connection)
        .map_err(|err| format!("Error querying database: {}", err))
}

#[command]
pub async fn get_players(search: String) -> Result<Vec<String>, String> {
    let mut connection = db::establish_db_connection();
    let search_param = format!("%{}%", search);

    participants
        .select(player_name)
        .distinct()
        .filter(player_name.like(search_param))
        .load::<String>(&mut connection)
        .map_err(|err| format!("Error querying database: {}", err))
}

#[command]
pub async fn get_teams(search: String) -> Result<Vec<TeamInfoStruct>, String> {
    let mut connection = db::establish_db_connection();
    let search_param = format!("%{}%", search);
    let query = r#"
        SELECT team_name, team_logo FROM (
            SELECT team1_name AS team_name, team1_logo AS team_logo 
            FROM series 
            WHERE team1_name IS NOT NULL
            UNION
            SELECT team2_name AS team_name, team2_logo AS team_logo 
            FROM series 
            WHERE team2_name IS NOT NULL
        ) AS teams
        WHERE team_name LIKE ?
    "#;
    diesel::sql_query(query)
        .bind::<diesel::sql_types::Text, _>(search_param)
        .load::<TeamInfoStruct>(&mut connection)
        .map_err(|err| format!("Error querying database: {}", err))
}

#[command]
pub async fn start_sync(auth_token: String) -> Result<String, String> {
    info!("Starting sync process with authentication...");
    loop {
        match sync_once(auth_token.clone()).await {
            Ok(count) => info!("Sync completed: {} series updated", count),
            Err(err) => {
                error!("Sync error: {}", err);
                return Err(err.to_string());
            }
        }
        sleep(Duration::from_secs(600)).await; // Sync every 10 minutes
    }
}

#[command]
pub async fn clear_db() -> Result<String, String> {
    use crate::db::schema::participants::dsl::participants;
    use crate::db::schema::series::dsl::series;
    use diesel::result::Error;

    let mut connection = db::establish_db_connection();

    connection
        .transaction::<_, Error, _>(|conn| {
            let deleted_participants =
                diesel::delete(participants).execute(conn).map_err(|err| {
                    error!("Error clearing participants table: {}", err);
                    err
                })?;
            let deleted_series = diesel::delete(series).execute(conn).map_err(|err| {
                error!("Error clearing series table: {}", err);
                err
            })?;

            info!(
                "Database cleared: {} participants and {} series deleted.",
                deleted_participants, deleted_series
            );
            Ok((deleted_participants, deleted_series))
        })
        .map(|(deleted_participants, deleted_series)| {
            format!(
                "Database cleared: {} participants and {} series deleted.",
                deleted_participants, deleted_series
            )
        })
        .map_err(|err| format!("Failed to clear database: {}", err))
}

#[derive(Serialize, Deserialize)]
pub struct SeriesWithParticipants {
    pub series: Series,
    pub participants: Vec<Participant>,
}
#[command]
pub async fn get_series_with_participants(
    filters: FilterConfig,
    auth_token: String,
) -> Result<Vec<SeriesWithParticipants>, String> {
    // Helper to check if two patch strings match for the first segments.
    fn patch_matches(series_patch: &str, filter_patch: &str) -> bool {
        let normalize = |s: &str| {
            s.split('.')
                .map(|part| part.parse::<u32>().unwrap_or(0))
                .collect::<Vec<u32>>()
        };
        let series_parts = normalize(series_patch);
        let filter_parts = normalize(filter_patch);

        // Determine the number of segments to compare:
        let segments_to_compare = if series_parts.len() >= 2 && filter_parts.len() >= 2 {
            2
        } else {
            std::cmp::min(series_parts.len(), filter_parts.len())
        };

        for i in 0..segments_to_compare {
            if series_parts[i] != filter_parts[i] {
                return false;
            }
        }
        true
    }

    // Helper to extract banned champions from an event log string.
    // This expects the event log to be a JSON array where each element is an object like:
    // { "node": { "type": "team-banned-character", "sentenceChunks": [ { "text": "Blue" }, { "text": "banned" }, { "text": "ChampionName" } ] } }
    fn extract_banned_champions(event_log_str: &str) -> Vec<String> {
        let mut banned = Vec::new();
        if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(event_log_str) {
            if let Some(events) = json_value.as_array() {
                for event in events {
                    if let Some(node) = event.get("node") {
                        if let Some(event_type) = node.get("type").and_then(|v| v.as_str()) {
                            if event_type == "team-banned-character" {
                                if let Some(chunks) =
                                    node.get("sentenceChunks").and_then(|v| v.as_array())
                                {
                                    // Expect at least three chunks: [team, "banned", champion]
                                    if chunks.len() >= 3 {
                                        if let Some(champion) =
                                            chunks[2].get("text").and_then(|v| v.as_str())
                                        {
                                            banned.push(champion.to_string());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        banned
    }

    let mut connection = db::establish_db_connection();

    // Fetch all series from the database.
    let all_series: Vec<Series> = match series.load::<Series>(&mut connection) {
        Ok(series_result) => series_result,
        Err(err) => return Err(format!("Error querying series: {}", err)),
    };

    // If wins/losses filtering is enabled, try to get the user's team ID.
    let mut my_team_id: Option<String> = None;
    if filters.wins || filters.losses {
        match get_my_team_id(auth_token.clone()).await {
            Ok(team_id) => {
                my_team_id = Some(team_id);
            }
            Err(err) => {
                warn!(
                    "Could not determine my_team_id: {}. Wins/Losses filter will be ignored.",
                    err
                );
            }
        }
    }

    let mut results = Vec::new();

    for series_entry in all_series {
        // ---- Filter by Patch ----
        if !filters.patch.is_empty() && !patch_matches(&series_entry.patch, &filters.patch) {
            info!(
                "Series ID {} excluded due to patch mismatch: {} does not match {}",
                series_entry.series_id, series_entry.patch, filters.patch
            );
            continue;
        }

        // ---- Filter by Date Range ----
        if filters.date_range.from.is_some() || filters.date_range.to.is_some() {
            if let Some(ref start_time) = series_entry.start_time_scheduled {
                if let Some(ref from_date) = filters.date_range.from {
                    if start_time < from_date {
                        info!(
                            "Series ID {} excluded because start time {} is before {}",
                            series_entry.series_id, start_time, from_date
                        );
                        continue;
                    }
                }
                if let Some(ref to_date) = filters.date_range.to {
                    if start_time > to_date {
                        info!(
                            "Series ID {} excluded because start time {} is after {}",
                            series_entry.series_id, start_time, to_date
                        );
                        continue;
                    }
                }
            } else {
                info!(
                    "Series ID {} excluded because it has no start time for date filtering",
                    series_entry.series_id
                );
                continue;
            }
        }

        // ---- Filter by Wins/Losses ----
        if filters.wins || filters.losses {
            if series_entry.team1_id.is_none()
                || series_entry.team2_id.is_none()
                || series_entry.team1_score.is_none()
                || series_entry.team2_score.is_none()
            {
                info!(
                    "Series ID {} excluded because team information is missing",
                    series_entry.series_id
                );
                continue;
            }
            let team1_id = series_entry.team1_id.clone().unwrap();
            let team2_id = series_entry.team2_id.clone().unwrap();
            let team1_score = series_entry.team1_score.unwrap();
            let team2_score = series_entry.team2_score.unwrap();

            if let Some(ref my_team) = my_team_id {
                if &team1_id != my_team && &team2_id != my_team {
                    info!(
                        "Series ID {} excluded because it doesn't involve my team",
                        series_entry.series_id
                    );
                    continue;
                }

                let my_team_won = (team1_id == *my_team && team1_score >= team2_score)
                    || (team2_id == *my_team && team2_score >= team1_score);
                let my_team_lost = (team1_id == *my_team && team1_score < team2_score)
                    || (team2_id == *my_team && team2_score < team1_score);

                let show_wins = filters.wins && my_team_won;
                let show_losses = filters.losses && my_team_lost;

                if !(show_wins || show_losses) {
                    info!(
                        "Series ID {} excluded based on win/loss filters",
                        series_entry.series_id
                    );
                    continue;
                }
            }
        }

        // ---- Filter by Teams ----
        if !filters.teams.is_empty() {
            let allowed_team_names: Vec<String> =
                filters.teams.iter().map(|t| t.value.clone()).collect();
            let team1_ok = series_entry
                .team1_name
                .as_ref()
                .map(|name| allowed_team_names.contains(name))
                .unwrap_or(false);
            let team2_ok = series_entry
                .team2_name
                .as_ref()
                .map(|name| allowed_team_names.contains(name))
                .unwrap_or(false);
            if !team1_ok && !team2_ok {
                info!(
                    "Series ID {} excluded due to team filter",
                    series_entry.series_id
                );
                continue;
            }
        }

        // ---- Fetch Participants for this Series ----
        let series_id_val = series_entry.series_id.clone();
        let all_participants: Vec<Participant> = match participants
            .filter(participant_series_id.eq(&series_id_val))
            .load::<Participant>(&mut connection)
        {
            Ok(participants_val) => participants_val,
            Err(err) => {
                return Err(format!(
                    "Error querying participants for series {}: {}",
                    series_id_val, err
                ));
            }
        };

        // ---- Filter by Champions Picked ----
        if !filters.champions_picked.is_empty() {
            let picked_champions: Vec<String> = filters
                .champions_picked
                .iter()
                .map(|c| c.champ.clone())
                .collect();
            match filters.champ_picked_mode {
                Modes::Any => {
                    let picked_in_game = picked_champions
                        .iter()
                        .any(|champ| all_participants.iter().any(|p| p.champion_name == *champ));
                    if !picked_in_game {
                        info!(
                            "Series ID {} excluded because no picked champions were found",
                            series_entry.series_id
                        );
                        continue;
                    }
                }
                Modes::Only => {
                    let picked_in_game = picked_champions
                        .iter()
                        .all(|champ| all_participants.iter().any(|p| p.champion_name == *champ));
                    if !picked_in_game {
                        info!(
                            "Series ID {} excluded because not all picked champions were found",
                            series_entry.series_id
                        );
                        continue;
                    }
                }
            }
        }

        // ---- Filter by Champions Banned (using event log) ----
        if !filters.champions_banned.is_empty() {
            let banned_filter: Vec<String> = filters
                .champions_banned
                .iter()
                .map(|c| c.champ.clone())
                .collect();

            // Query the event log for this series.
            use crate::db::schema::event_logs::dsl as e;
            let event_log_opt = e::event_logs
                .filter(e::series_id.eq(&series_id_val))
                .first::<crate::db::models::EventLog>(&mut connection)
                .optional()
                .map_err(|err| format!("Error querying event log: {}", err))?;

            if let Some(event_log_record) = event_log_opt {
                let banned_champs = extract_banned_champions(&event_log_record.event_log);
                let banned_in_game = banned_filter
                    .iter()
                    .any(|champ| banned_champs.contains(champ));
                if !banned_in_game {
                    info!(
                        "Series ID {} excluded because banned champions ({:?}) were not found in event log",
                        series_entry.series_id, banned_champs
                    );
                    continue;
                }
            }
        }

        // ---- Filter by Players ----
        if !filters.players.is_empty() {
            let allowed_player_names: Vec<String> =
                filters.players.iter().map(|p| p.value.clone()).collect();
            let player_found = all_participants
                .iter()
                .any(|p| allowed_player_names.contains(&p.player_name));
            if !player_found {
                info!(
                    "Series ID {} excluded because none of the players match the filter",
                    series_entry.series_id
                );
                continue;
            }
        }

        // If the series passed all filters, include it along with its participants.
        results.push(SeriesWithParticipants {
            series: series_entry,
            participants: all_participants,
        });
    }

    if results.is_empty() {
        return Err("No Series Found.".to_string());
    }
    results.sort_by(|a, b| {
        match (
            &a.series.start_time_scheduled,
            &b.series.start_time_scheduled,
        ) {
            (Some(a_time), Some(b_time)) => b_time.cmp(a_time),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => std::cmp::Ordering::Equal,
        }
    });

    Ok(results)
}
