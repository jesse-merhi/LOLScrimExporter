// src/commands.rs

use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::command;
use futures::future::join_all;
use log::{info, warn, error};

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
    pub dateRange: DateRange,
    pub wins: bool,
    pub losses: bool,
    pub patch: String,
    pub championsPicked: Vec<ChampionSelection>,
    pub championsBanned: Vec<ChampionSelection>,
    pub teams: Vec<TeamFilter>,
    pub players: Vec<PlayerFilter>,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct TeamInfo {
    pub baseInfo: Option<BaseInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BaseInfo {
    pub logoUrl: String,
    pub id: String,
    pub name: String,

}

#[derive(Debug, Serialize, Deserialize)]
pub struct SeriesNode {
    pub id: String,
    pub startTimeScheduled: Option<String>,
    pub teams: Vec<TeamInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SeriesEdge {
    pub node: SeriesNode,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageInfo {
    pub hasNextPage: bool,
    pub endCursor: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AllSeries {
    pub edges: Vec<SeriesEdge>,
    pub pageInfo: PageInfo,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeriesState {
    pub title: Title,
    pub finished: bool,
    pub teams: Vec<SeriesTeam>
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeriesStateWithId {
    pub id: String,
    pub title: Title,
    pub finished: bool,
    pub teams: Vec<SeriesTeam>
}

impl SeriesStateWithId {
    pub fn from_series_state(series_state: SeriesState, id: String) -> Self {
        Self {
            id,
            title: series_state.title,
            finished: series_state.finished,
            teams: series_state.teams
        }
    }
}



#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Title {
    pub nameShortened: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeriesTeam {
    pub id: String,
    pub score: i64,
    pub players: Vec<Player>,
    pub baseInfo: Option<BaseInfo>,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct GameStats {
    pub championName: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MyOrg {
    pub id: String,
    pub name: String,
    pub userCount: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TeamNode {
    pub node: TeamInfoShort,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TeamInfoShort {
    pub id: String,
    pub name: String,
    pub logoUrl: String,
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
    pub end_cursor: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FilteredSeriesDetail {
    pub series_state: SeriesStateWithId,
    pub participants: Vec<GameStats>,
    pub patch: String,
}

// ==============================
// Backend Command Implementation
// ==============================

#[command]
pub async fn fetch_and_process_series(
    filters: FilterConfig,
    auth_token: String,
    end_cursor: Option<String>,
) -> Result<FilteredSeriesResult, String> {
    let client = Client::new();
    info!("Starting fetch_and_process_series command");
    info!("Filters: {:?}", filters);
    info!("End Cursor: {:?}", end_cursor);

    // ==============================
    // Step 1: Fetch Historical Series
    // ==============================

    let graphql_body = serde_json::json!({
        "operationName": "GetHistoricalSeries",
        "variables": {
            "after": end_cursor,
            "first":10,
            "types":["SCRIM"],
            "windowStartTime": filters.dateRange.from.clone().unwrap_or_else(|| "2020-01-01T00:00:00.000Z".to_string()),
            "windowEndTime": filters.dateRange.to.clone().unwrap_or_else(|| "2100-01-01T00:00:00.000Z".to_string()),
            "teamIds": if !filters.teams.is_empty() {
                Some(filters.teams.iter().map(|t| t.value.clone()).collect::<Vec<String>>())
            } else {
                None
            },
            "livePlayerIds": if !filters.players.is_empty() {
                Some(filters.players.iter().map(|p| p.value.clone()).collect::<Vec<String>>())
            } else {
                None
            }
        },
        "query": r#"
          query GetHistoricalSeries(
            $windowStartTime: String!
            $windowEndTime: String!
            $after: Cursor
            $first: Int
            $livePlayerIds: [ID!]
            $teamIds: [ID!]
            $types: [SeriesType!]
            ) {
            allSeries(
                filter: {
                startTimeScheduled: { gte: $windowStartTime, lte: $windowEndTime }
                livePlayerIds: { in: $livePlayerIds }
                teamIds: { in: $teamIds }
                types: $types
                }
                first: $first
                after: $after
                orderBy: StartTimeScheduled
                orderDirection: DESC
            ) {
                totalCount
                pageInfo {
                hasPreviousPage
                hasNextPage
                startCursor
                endCursor
                }
                edges {
                node {
                    id
                    type
                    title {
                    name
                    nameShortened
                    }
                    tournament {
                    name
                    }
                    startTimeScheduled
                    format {
                    nameShortened
                    }
                    teams {
                    baseInfo {
                        name
                        logoUrl
                        id
                    }
                    }
                }
                }
            }
            }
        "#
    });

    info!("GraphQL query body: {}", graphql_body);

    // Send the request to fetch historical series
    let response = client
        .post("https://api.grid.gg/central-data/graphql")
        .header("Authorization", format!("Bearer {}", auth_token))
        .header("Content-Type", "application/json")
        .json(&graphql_body)
        .send()
        .await
        .map_err(|err| {
            error!("Network error while fetching historical series: {}", err);
            format!("Network error: {}", err)
        })?;

    info!("Received response with status: {}", response.status());

    if !response.status().is_success() {
        let status = response.status();
        let error_body = match response.text().await {
            Ok(body) => body,
            Err(err) => format!("Failed to read error response body: {}", err),
        };
    
        if status == reqwest::StatusCode::UNAUTHORIZED {
            error!(
                "Unauthorized access with provided auth token. Response body: {}",
                error_body
            );
            return Err("Unauthorized: Invalid auth token".to_string());
        }
    
        error!(
            "Request failed with status: {}. Response body: {}",
           status,
            error_body
        );
        return Err(format!(
            "Request failed with status: {}. Error details: {}",
            status,
            error_body
        ));
    }

    let json_body: Value = match response.json().await {
        Ok(body) => {
            info!("Successfully parsed JSON body from historical series response");
            body
        }
        Err(err) => {
            error!("Failed to parse JSON from historical series response: {}", err);
            return Err(format!("Failed to parse JSON: {}", err));
        }
    };


    let all_series: AllSeries = match serde_json::from_value(
        json_body
            .pointer("/data/allSeries")
            .cloned()
            .ok_or_else(|| {
                error!("Missing 'allSeries' key in response. Full response: {:?}", json_body);
                "Missing 'allSeries' key in response".to_string()
            })?,
    ) {
        Ok(series) => {
            info!("Successfully deserialized all_series: {:?}", series);
            series
        }
        Err(err) => {
            error!("Failed to deserialize all_series: {}. Full response: {:?}", err, json_body);
            return Err(format!("Failed to parse 'allSeries': {}", err));
        }
    };

    info!("Fetched {} series entries", all_series.edges.len());

    let series_edges = all_series.edges;
    let page_info = all_series.pageInfo.clone();

    if series_edges.is_empty() {
        info!("No series found in the response");
        return Ok(FilteredSeriesResult {
            filtered_series: Vec::new(),
            has_more: false,
            end_cursor: page_info.endCursor,
        });
    }

    let series_ids: Vec<String> = series_edges.iter().map(|edge| edge.node.id.clone()).collect();
    info!("Series IDs fetched: {:?}", series_ids);

    // ==============================
    // Step 2: Fetch Series Details
    // ==============================

    let series_details_futures = series_ids.iter().map(|id| {
        let client_clone = client.clone();
        let auth_token_clone = auth_token.clone();
        async move {
            info!("Fetching series state for ID: {}", id);
            // Fetch series state
            let series_state_body = serde_json::json!({
                "operationName": "GetSeriesPlayersAndResults",
                "variables": { "id": id },
                "query": r#"
                  query GetSeriesPlayersAndResults($id: ID!) {
                      seriesState(id: $id) {
                          title {
                              nameShortened
                          }
                          finished
                          teams {
                              id
                              score
                              players {
                                  id
                                  name
                              }
                          }
                      }
                  }
                "#
            });

            info!("Series state query body for ID {}: {}", id, series_state_body);

            let series_response = client_clone
                .post("https://api.grid.gg/live-data-feed/series-state/graphql")
                .header("Authorization", format!("Bearer {}", auth_token_clone))
                .header("Content-Type", "application/json")
                .json(&series_state_body)
                .send()
                .await
                .map_err(|err| {
                    error!(
                        "Failed to fetch series state for ID {}: {}",
                        id, err
                    );
                    format!("Failed to fetch series state for ID {}: {}", id, err)
                })
                .ok()?;

            info!(
                "Received series state response for ID {} with status: {}",
                id,
                series_response.status()
            );

            if !series_response.status().is_success() {
                error!(
                    "Failed to fetch series state for ID {}: {} ",
                    id,
                    series_response.status()
                );
                return None;
            }

            let series_details: SeriesState = match series_response.json::<Value>().await {
                Ok(json_data) => {
                    // Extract the series state from body.data.seriesState
                    if let Some(series_state_value) = json_data.pointer("/data/seriesState") {
                        match serde_json::from_value(series_state_value.clone()) {
                            Ok(parsed_data) => {
                                info!("Successfully parsed series state for ID {}", id);
                                parsed_data
                            }
                            Err(err) => {
                                error!(
                                    "Failed to parse series state for ID {}: {}. Full response: {:?}",
                                    id, err, series_state_value
                                );
                                return None;
                            }
                        }
                    } else {
                        error!(
                            "Missing 'seriesState' in response for ID {}. Full response: {:?}",
                            id, json_data
                        );
                        return None;
                    }
                }
                Err(err) => {
                    error!(
                        "Failed to read series state response for ID {}: {}",
                        id, err
                    );
                    return None;
                }
            };
            
            

            // Fetch game summary
            let game_summary_url = format!(
                "https://api.grid.gg/file-download/end-state/riot/series/{}/games/1/summary",
                id
            );

            info!("Fetching game summary from URL: {}", game_summary_url);

            let game_summary_response = client_clone
                .get(&game_summary_url)
                .header("Authorization", format!("Bearer {}", auth_token_clone))
                .send()
                .await
                .map_err(|err| {
                    error!(
                        "Failed to fetch game summary for ID {}: {}",
                        id, err
                    );
                    format!("Failed to fetch game summary for ID {}: {}", id, err)
                })
                .ok()?;

            info!(
                "Received game summary response for ID {} with status: {}",
                id,
                game_summary_response.status()
            );

            if !game_summary_response.status().is_success() {
                error!(
                    "Failed to fetch game summary for ID {}: {}",
                    id,
                    game_summary_response.status()
                );
                return None;
            }

            let game_summary_data: Value = match game_summary_response.json().await {
                Ok(data) => {
                    info!("Successfully parsed game summary for ID {}", id);
                    data
                }
                Err(err) => {
                    error!(
                        "Failed to parse game summary for ID {}: {}",
                        id, err
                    );
                    return None;
                }
            };

            let patch = game_summary_data
                .get("gameVersion")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            info!("Patch version for ID {}: {}", id, patch);

            let participants = game_summary_data
                .get("participants")
                .and_then(|v| v.as_array())
                .unwrap_or(&vec![])
                .iter()
                .filter_map(|p| p.get("championName").and_then(|c| c.as_str()).map(|c| GameStats {
                    championName: c.to_string(),
                }))
                .collect::<Vec<GameStats>>();

            info!("Participants for ID {}: {:?}", id, participants);
            
            let series_state_with_id = SeriesStateWithId::from_series_state(series_details, id.to_string());
            Some(FilteredSeriesDetail {
                series_state: series_state_with_id,
                participants,
                patch,
            })
        }
    });

    info!("Initiating concurrent fetches for series details");

    // Await all series details concurrently
    let series_details_results = join_all(series_details_futures).await;

    info!("Completed fetching series details");

    // Collect valid series details
    let mut valid_series_details = Vec::new();

    for detail in series_details_results {
        if let Some(detail) = detail {
            valid_series_details.push(detail);
        }
    }

    info!(
        "Collected {} valid series details after filtering failed or incomplete fetches",
        valid_series_details.len()
    );

    // ==============================
    // Step 3: Fetch User's Team ID
    // ==============================

    info!("Fetching user's organization info to retrieve team name");

    // Fetch my organization info to get my team name
    let org_response = client
        .get("https://lol.grid.gg/api/organisations/mine")
        .header("Authorization", format!("Bearer {}", auth_token))
        .send()
        .await
        .map_err(|err| {
            error!("Failed to fetch organization info: {}", err);
            format!("Failed to fetch organization info: {}", err)
        })?;

    info!(
        "Received organization info response with status: {}",
        org_response.status()
    );

    if !org_response.status().is_success() {
        error!(
            "Failed to fetch organization info: {}",
            org_response.status()
        );
        return Err(format!(
            "Failed to fetch organization info: {}",
            org_response.status()
        ));
    }

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
    let teams_result = {
        // Build GraphQL request to fetch teams by name
        let teams_filter_body = serde_json::json!({
            "operationName": "GetTeamsFilter",
            "variables": {
                "first": 50,
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
        });

        info!("GraphQL query body for fetching teams: {}", teams_filter_body);

        let teams_response = client
            .post("https://api.grid.gg/central-data/graphql")
            .header("Authorization", format!("Bearer {}", auth_token))
            .header("Content-Type", "application/json")
            .json(&teams_filter_body)
            .send()
            .await
            .map_err(|err| {
                error!(
                    "Failed to fetch teams by name '{}': {}",
                    my_team_name, err
                );
                format!(
                    "Failed to fetch teams by name '{}': {}",
                    my_team_name, err
                )
            })?;

        info!(
            "Received teams filter response with status: {}",
            teams_response.status()
        );

        if !teams_response.status().is_success() {
            error!(
                "Failed to fetch teams by name '{}': {}",
                my_team_name,
                teams_response.status()
            );
            return Err(format!(
                "Failed to fetch teams by name '{}': {}",
                my_team_name,
                teams_response.status()
            ));
        }

        let teams_filter_resp: TeamsFilterResponse = match teams_response.json().await {
            Ok(data) => {
                info!("Successfully parsed teams filter response");
                data
            }
            Err(err) => {
                error!("Failed to parse teams filter response: {}", err);
                return Err(format!("Failed to parse teams filter response: {}", err));
            }
        };

        let teams: Vec<TeamInfoShort> = teams_filter_resp
            .data
            .teams
            .edges
            .into_iter()
            .map(|edge| edge.node)
            .collect();

        info!("Fetched teams: {:?}", teams);

        if teams.is_empty() {
            warn!("No teams found matching the name '{}'", my_team_name);
            None
        } else {
            info!("Found team ID: {}", teams[0].id);
            Some(teams[0].id.clone())
        }
    };

    let my_team_id = teams_result;
    info!("User's team ID: {:?}", my_team_id);

    // ==============================
    // Step 4: Apply All Filters
    // ==============================

    let mut is_earlier_patch = false;

    info!("Applying filters to the fetched series details");

    let filtered_series_details = valid_series_details.into_iter().filter(|detail| {
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
        if !filters.championsPicked.is_empty() {
            let picked_champions: Vec<String> = filters
                .championsPicked
                .iter()
                .map(|c| c.label.clone())
                .collect();
            let picked_in_game =
                participants.iter().any(|p| picked_champions.contains(&p.championName));
            if !picked_in_game {
                info!(
                    "Series ID {} excluded because no picked champions were found in the game",
                    series_state.id
                );
                return false;
            }
        }

        // ---- Filter by Champions Banned ----
        if !filters.championsBanned.is_empty() {
            let banned_champions: Vec<String> = filters
                .championsBanned
                .iter()
                .map(|c| c.label.clone())
                .collect();
            let banned_in_game =
                participants.iter().any(|p| banned_champions.contains(&p.championName));
            if !banned_in_game {
                info!(
                    "Series ID {} excluded because no banned champions were found in the game",
                    series_state.id
                );
                return false;
            }
        }

        true
    }).collect::<Vec<FilteredSeriesDetail>>();

    info!(
        "Filtered series details count: {}",
        filtered_series_details.len()
    );

    // If earlier patch and no results, stop pagination
    if is_earlier_patch && filtered_series_details.is_empty() {
        info!("Stopping pagination due to earlier patch and no results");
        return Ok(FilteredSeriesResult {
            filtered_series: Vec::new(),
            has_more: false,
            end_cursor: page_info.endCursor,
        });
    }

    // ==============================
    // Step 5: Map to SeriesNode
    // ==============================

    info!("Mapping filtered series details to SeriesNode");

    let filtered_series : Vec<SeriesStateWithId> = filtered_series_details.into_iter().map(|detail| detail.series_state.clone()).collect();

    info!(
        "Prepared {} SeriesNode entries to return",
        filtered_series.len()
    );

    // ==============================
    // Step 6: Return Filtered Results
    // ==============================

    info!("Returning filtered series results");

    Ok(FilteredSeriesResult {
        filtered_series,
        has_more: all_series.pageInfo.hasNextPage,
        end_cursor: all_series.pageInfo.endCursor,
    })
}
