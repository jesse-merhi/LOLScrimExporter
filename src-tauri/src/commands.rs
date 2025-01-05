// src/commands.rs
use log::{error, info, warn};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::command;

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
    #[serde(rename = "dateRange")]
    pub date_range: DateRange,
    pub wins: bool,
    pub losses: bool,
    pub patch: String,
    #[serde(rename = "championsPicked")]
    pub champions_picked: Vec<ChampionSelection>,
    #[serde(rename = "championsBanned")]
    pub champions_banned: Vec<ChampionSelection>,
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
    pub title: Title,
    pub finished: bool,
    pub teams: Vec<SeriesTeam>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeriesStateWithId {
    pub id: String,
    pub title: Title,
    pub finished: bool,
    pub teams: Vec<SeriesTeam>,
    #[serde(rename = "startTimeScheduled")]
    pub start_time_scheduled: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Title {
    #[serde(rename = "nameShortended")]
    pub name_shortened: String,
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
                "first": 1,
                "name": { "contains": my_team_name }
            },
            "query": r#"
            query GetTeamsFilter($name: StringFilter, $first: Int) {
                teams(filter: { name: $name }, first: $first) {
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
pub async fn filter_series(
    series_details: Vec<FilteredSeriesDetail>,
    filters: FilterConfig,
    auth_token: String,
) -> Result<Vec<FilteredSeriesDetail>, String> {
    // Get user's team ID if wins/losses filter is enabled
    let mut my_team_id: Option<String> = None;
    if filters.wins || filters.losses {
        my_team_id = Some(get_my_team_id(auth_token.clone()).await?);
    }
    let mut is_earlier_patch = false;
    let filtered_series_details = series_details
        .into_iter()
        .filter(|detail| {
            let series_state = &detail.series_state;
            let participants = &detail.participants;
            let patch = &detail.patch;

            // ---- Filter by Patch ----
            if !filters.patch.is_empty() {
                if !patch.starts_with(&filters.patch) {
                    if patch < &filters.patch {
                        is_earlier_patch = true;
                        info!(
                            "Series ID {} excluded due to earlier patch: {} < {}",
                            series_state.id, patch, filters.patch
                        );
                    } else {
                        info!(
                        "Series ID {} excluded due to patch mismatch: {} does not start with {}",
                        series_state.id, patch, filters.patch
                    );
                    }
                    return false;
                }
            }

            // ---- Filter by Wins/Losses ----
            if filters.wins || filters.losses {
                if series_state.teams.len() >= 2 && my_team_id.is_some() {
                    let my_team_id_ref = my_team_id.as_ref().unwrap();
                    let team1 = &series_state.teams[0];
                    let team2 = &series_state.teams[1];

                    let is_team1 = &team1.id == my_team_id_ref;
                    let is_team2 = &team2.id == my_team_id_ref;

                    let my_team_won = (is_team1 && team1.score >= team2.score)
                        || (is_team2 && team2.score >= team1.score);
                    let my_team_lost = (is_team1 && team1.score < team2.score)
                        || (is_team2 && team2.score < team1.score);

                    let show_wins = filters.wins && my_team_won;
                    let show_losses = filters.losses && my_team_lost;

                    if !(show_wins || show_losses) {
                        info!(
                            "Series ID {} excluded based on win/loss filters",
                            series_state.id
                        );
                        return false;
                    }
                }
            }

            // ---- Filter by Champions Picked ----
            if !filters.champions_picked.is_empty() {
                let picked_champions: Vec<String> = filters
                    .champions_picked
                    .iter()
                    .map(|c| c.label.clone())
                    .collect();
                let picked_in_game = participants
                    .iter()
                    .any(|p| picked_champions.contains(&p.champion_name));
                if !picked_in_game {
                    info!(
                        "Series ID {} excluded because no picked champions were found in the game",
                        series_state.id
                    );
                    return false;
                }
            }

            // ---- Filter by Champions Banned ----
            if !filters.champions_banned.is_empty() {
                let banned_champions: Vec<String> = filters
                    .champions_banned
                    .iter()
                    .map(|c| c.label.clone())
                    .collect();
                let banned_in_game = participants
                    .iter()
                    .any(|p| banned_champions.contains(&p.champion_name));
                info!("Banned in game: {}", banned_in_game);
                info!("Banned champions: {:?}", banned_champions);
                if banned_in_game {
                    info!(
                        "Series ID {} excluded because banned champions were found in the game",
                        series_state.id
                    );
                    return false;
                }
            }

            true
        })
        .collect::<Vec<FilteredSeriesDetail>>();
    Ok(filtered_series_details)
}
