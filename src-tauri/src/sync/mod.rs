use crate::db;
use crate::db::models::{NewParticipant, NewSeries, Series};
use crate::db::schema::participants::dsl as p;
use crate::db::schema::series::dsl as s;
use diesel::prelude::*;
use log::{error, info, warn};
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;
use tokio::time::sleep;

const GRAPHQL_URL: &str = "https://api.grid.gg/central-data/graphql";
const MAX_RETRIES: u32 = 5;
const PAGE_SIZE: usize = 50;

pub async fn sync_once(auth_token: String) -> Result<usize, String> {
    let client = Client::new();
    let mut inserted_count = 0;
    let mut page_cursor: Option<String> = None;
    let mut connection = db::establish_db_connection();

    loop {
        let graphql_query = serde_json::json!({
            "operationName": "GetHistoricalSeries",
            "variables": {
                "first": PAGE_SIZE,
                "after": page_cursor,
                "types": vec!["SCRIM"],
            },
            "query": "query GetHistoricalSeries($first: Int, $after: Cursor, $types: [SeriesType!]) {
                allSeries(first: $first, after: $after, orderBy: StartTimeScheduled, orderDirection: DESC, 
                filter: {
                    types: $types
                    }
                ) {
                    edges {
                        node {
                            id
                            startTimeScheduled
                            teams {
                                baseInfo {
                                    name
                                    logoUrl
                                    id
                                }
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }"
        });

        let response = fetch_with_retry(&client, &graphql_query, &auth_token).await?;
        let json: Value = response.json().await.map_err(|err| err.to_string())?;
        if let Some(error_val) = json.get("errors") {
            if let Some(errors) = error_val.as_array() {
                let error_messages: Vec<String> = errors
                    .iter()
                    .map(|err| {
                        // If each error is already a string, use it, otherwise fallback to a debug string.
                        err.as_str().unwrap_or(&err.to_string()).to_string()
                    })
                    .collect();
                return Err(error_messages.join(", "));
            } else {
                // Fallback if "errors" is not an array.
                return Err("Unknown Error".to_string());
            }
        }
        let series_array = json["data"]["allSeries"]["edges"]
            .as_array()
            .ok_or("Invalid series response format")?;

        info!("Found {} series", series_array.len());

        for series_item in series_array {
            let series_node = &series_item["node"];
            let series_id_val = series_node["id"].as_str().unwrap_or_default();
            let finished_val = series_node["finished"].as_bool().unwrap_or(false);
            let start_time_val = series_node["startTimeScheduled"].as_str();
            let default_teams = vec![];
            let teams = series_node["teams"].as_array().unwrap_or(&default_teams);

            info!("{}", series_item);
            // Skip series items that don't have at least two teams (if this could even happen)
            if teams.len() < 2 {
                continue;
            }
            let team1_logo_url = teams[0]["baseInfo"]["logoUrl"].as_str();
            let team2_logo_url = teams[1]["baseInfo"]["logoUrl"].as_str();
            let team1_name_val = teams[0]["baseInfo"]["name"].as_str();
            let team2_name_val = teams[1]["baseInfo"]["name"].as_str();
            let team1_id_val = teams[0]["baseInfo"]["id"].as_str();
            let team2_id_val = teams[1]["baseInfo"]["id"].as_str();

            // Try to load an existing series record
            let existing_series = s::series
                .filter(s::series_id.eq(series_id_val))
                .first::<Series>(&mut connection)
                .optional()
                .expect("Error loading series");

            if let Some(existing) = existing_series {
                info!("Found Existing Series for {}", series_id_val);
                // Compare stored details with the new ones
                let details_same = existing.finished == finished_val
                    && existing.start_time_scheduled.as_deref() == start_time_val
                    && existing.team1_id.as_deref() == team1_id_val
                    && existing.team2_id.as_deref() == team2_id_val;

                if !details_same {
                    // Update the record with the new details
                    let update_result =
                        diesel::update(s::series.filter(s::series_id.eq(series_id_val)))
                            .set((
                                s::finished.eq(finished_val),
                                s::start_time_scheduled.eq(start_time_val),
                                s::team1_id.eq(team1_id_val),
                                s::team2_id.eq(team2_id_val),
                                s::team1_logo.eq(team1_logo_url),
                                s::team1_name.eq(team1_name_val),
                                s::team2_logo.eq(team2_logo_url),
                                s::team2_name.eq(team2_name_val),
                            ))
                            .execute(&mut connection);
                    match update_result {
                        Ok(count) => info!(
                            "Updated series {} with new details ({} row(s) affected).",
                            series_id_val, count
                        ),
                        Err(err) => error!("Failed to update series {}: {}", series_id_val, err),
                    }
                }

                // If game summary scores are missing, fetch the summary
                if existing.team1_score.is_none() || existing.team2_score.is_none() {
                    let result = fetch_game_summary_with_retry(
                        &client,
                        series_id_val,
                        &mut connection,
                        &auth_token,
                    )
                    .await;
                    match result {
                        Ok(success) => info!(
                            "Fetched game summary successfully for series {}: {}",
                            series_id_val, success
                        ),
                        Err(err) => error!(
                            "Failed to fetch game summary for series {}: {}",
                            series_id_val, err
                        ),
                    }
                }
            } else {
                // No existing record: insert new series
                let new_series = NewSeries {
                    series_id: series_id_val,
                    finished: finished_val,
                    start_time_scheduled: start_time_val,
                    patch: Some("None"),
                    team1_id: team1_id_val,
                    team1_name: team1_name_val,
                    team1_score: None,
                    team1_logo: team1_logo_url,
                    team2_id: team2_id_val,
                    team2_name: team2_name_val,
                    team2_score: None,
                    team2_logo: team2_logo_url,
                };

                match diesel::insert_into(s::series)
                    .values(&new_series)
                    .execute(&mut connection)
                {
                    Ok(count) => {
                        inserted_count += count;
                        info!("Inserted new series {}.", series_id_val);
                    }
                    Err(err) => {
                        error!("Failed to insert series {}: {}", series_id_val, err);
                        continue; // Skip further processing for this series item
                    }
                }

                // After inserting, run fetch_game_summary_with_retry to populate scores and other details
                let result = fetch_game_summary_with_retry(
                    &client,
                    series_id_val,
                    &mut connection,
                    &auth_token,
                )
                .await;
                match result {
                    Ok(success) => info!(
                        "Fetched game summary successfully for new series {}: {}",
                        series_id_val, success
                    ),
                    Err(err) => error!(
                        "Failed to fetch game summary for new series {}: {}",
                        series_id_val, err
                    ),
                }
            }
            match fetch_and_store_event_log(&client, series_id_val, &mut connection, &auth_token)
                .await
            {
                Ok(_) => info!("Event log saved for series {}", series_id_val),
                Err(err) => error!(
                    "Failed to save event log for series {}: {}",
                    series_id_val, err
                ),
            }
        }

        let page_info = json["data"]["allSeries"]["pageInfo"].clone();
        if !page_info["hasNextPage"].as_bool().unwrap_or(false) {
            break;
        }
        page_cursor = page_info["endCursor"].as_str().map(|s| s.to_string());
    }

    info!("Synced {} series", inserted_count);
    Ok(inserted_count)
}

async fn fetch_and_store_event_log(
    client: &Client,
    series_id: &str,
    connection: &mut SqliteConnection,
    auth_token: &str,
) -> Result<(), String> {
    let event_log_url = "https://lol.grid.gg/api/event-explorer-api/events/graphql";
    let graphql_query = serde_json::json!({
        "operationName": "getSeriesEvents",
        "variables": {
            "id": series_id,
            "filter": {
                "event": [
                    { "type": { "eq": "team-banned-character" } },
                    { "type": { "eq": "team-picked-character" } },
                    { "type": { "eq": "grid-validated-series" } }
                ]
            }
        },
        "query": "query getSeriesEvents($id: String!, $filter: EventsFilter, $after: Cursor) {
            events(seriesId: $id, filter: $filter, after: $after) {
                edges {
                    node {
                        type
                        sentenceChunks {
                            text
                            strikethrough
                        }
                    }
                }
            }
        }"
    });

    let mut attempts = 0;
    while attempts < MAX_RETRIES {
        let response = client
            .post(event_log_url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", auth_token))
            .json(&graphql_query)
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => {
                let json: Value = resp.json().await.map_err(|err| err.to_string())?;
                let event_edges = json["data"]["events"]["edges"].clone();
                let event_log_str =
                    serde_json::to_string(&event_edges).map_err(|err| err.to_string())?;

                // Insert or update the event log in the database.
                use crate::db::schema::event_logs::dsl as e;
                let existing_event_log = e::event_logs
                    .filter(e::series_id.eq(series_id))
                    .first::<crate::db::models::EventLog>(connection)
                    .optional()
                    .expect("Error loading event log");

                if let Some(_) = existing_event_log {
                    let update_result =
                        diesel::update(e::event_logs.filter(e::series_id.eq(series_id)))
                            .set(crate::db::schema::event_logs::event_log.eq(&event_log_str))
                            .execute(connection);
                    match update_result {
                        Ok(_) => info!("Updated event log for series {}", series_id),
                        Err(err) => error!(
                            "Failed to update event log for series {}: {}",
                            series_id, err
                        ),
                    }
                } else {
                    let new_event_log = crate::db::models::NewEventLog {
                        series_id,
                        event_log: &event_log_str,
                    };
                    match diesel::insert_into(e::event_logs)
                        .values(&new_event_log)
                        .execute(connection)
                    {
                        Ok(_) => info!("Inserted event log for series {}", series_id),
                        Err(err) => error!(
                            "Failed to insert event log for series {}: {}",
                            series_id, err
                        ),
                    }
                }
                return Ok(());
            }
            Ok(resp) if resp.status() == reqwest::StatusCode::TOO_MANY_REQUESTS => {
                let delay = (2_u64).pow(attempts);
                warn!(
                    "Rate limited fetching event log. Retrying in {:?} seconds...",
                    delay
                );
                sleep(Duration::from_secs(delay)).await;
            }
            Ok(resp) => {
                warn!(
                    "Unexpected response fetching event log: {:?}. Retrying...",
                    resp
                );
                sleep(Duration::from_secs((2_u64).pow(attempts))).await;
            }
            Err(err) => {
                warn!("Network error fetching event log: {}. Retrying...", err);
                sleep(Duration::from_secs((2_u64).pow(attempts))).await;
            }
        }
        attempts += 1;
    }
    Err("Max retries reached for event log".to_string())
}

async fn fetch_game_summary_with_retry(
    client: &Client,
    fetch_series_id: &str,
    connection: &mut SqliteConnection,
    auth_token: &str,
) -> Result<String, String> {
    let (team1_score_val, team2_score_val) =
        fetch_series_scores(client, fetch_series_id, auth_token).await?;

    let summary_url = format!(
        "https://api.grid.gg/file-download/end-state/riot/series/{}/games/1/summary",
        fetch_series_id
    );
    let mut attempts = 0;

    while attempts < MAX_RETRIES {
        let response = client
            .get(&summary_url)
            .header("Authorization", format!("Bearer {}", auth_token))
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => {
                let summary_json: Value = resp.json().await.map_err(|err| err.to_string())?;

                // ✅ Extract `gameVersion` like the frontend does
                let game_version = summary_json["gameVersion"]
                    .as_str()
                    .map(String::from)
                    .unwrap_or_else(|| "latest".to_string());
                // STILL NEED TO FETCH THE SCORES

                // ✅ Extract participants like the frontend does
                if let Some(participants_array) = summary_json["participants"].as_array() {
                    for participant_item in participants_array {
                        // Extract a unique identifier for the participant
                        let player_id_val = participant_item["summonerId"]
                            .as_number()
                            .map(|num| num.to_string())
                            .unwrap_or_default();

                        // Check if this participant already exists for the given series
                        let existing_participant = p::participants
                            .filter(p::series_id.eq(fetch_series_id))
                            .filter(p::player_id.eq(&player_id_val))
                            .first::<crate::db::models::Participant>(connection)
                            .optional()
                            .expect("Error loading participant");

                        if existing_participant.is_none() {
                            // Participant doesn't exist—insert it
                            let stats_json_val =
                                serde_json::to_string(participant_item).unwrap_or_default();
                            let new_participant = NewParticipant {
                                series_id: fetch_series_id.to_string(),
                                player_id: player_id_val.clone(),
                                player_name: participant_item["riotIdGameName"]
                                    .as_str()
                                    .unwrap_or("")
                                    .to_string(),
                                champion_name: participant_item["championName"]
                                    .as_str()
                                    .unwrap_or("")
                                    .to_string(),
                                stats_json: stats_json_val,
                            };

                            match diesel::insert_into(p::participants)
                                .values(&new_participant)
                                .execute(connection)
                            {
                                Ok(_) => {
                                    info!(
                                        "Inserted participant {} for series {}.",
                                        player_id_val, fetch_series_id
                                    );
                                }
                                Err(err) => {
                                    error!(
                                        "Failed to insert participant for series {}: {}",
                                        fetch_series_id, err
                                    );
                                }
                            }
                        } else {
                            // Participant already exists: skip insertion.
                            info!(
                                "Participant {} already exists for series {}.",
                                player_id_val, fetch_series_id
                            );
                        }
                    }
                }

                match diesel::update(s::series.filter(s::series_id.eq(fetch_series_id)))
                    .set((
                        s::team1_score.eq(team1_score_val),
                        s::team2_score.eq(team2_score_val),
                        s::patch.eq(game_version.clone()),
                    ))
                    .execute(connection)
                {
                    Ok(_) => info!("Updated scores for series {}", fetch_series_id),
                    Err(err) => warn!(
                        "Failed to update scores for series {}: {}",
                        fetch_series_id, err
                    ),
                }

                return Ok(game_version);
            }
            Ok(resp) if resp.status() == reqwest::StatusCode::TOO_MANY_REQUESTS => {
                let delay = (2_u64).pow(attempts);
                warn!(
                    "Rate limited fetching game summary. Retrying in {:?} seconds...",
                    delay
                );
                sleep(Duration::from_secs(delay)).await;
            }
            Err(res) => {
                warn!("Failed to fetch game summary {:?}. Retrying...", res);
                sleep(Duration::from_secs((2_u64).pow(attempts))).await;
            }
            Ok(res) => {
                warn!("Failed to fetch game summary {:?}. Retrying...", res);
                sleep(Duration::from_secs((2_u64).pow(attempts))).await;
            }
        }
        attempts += 1;
    }
    Err("Max retries reached".to_string())
}

async fn fetch_with_retry(
    client: &Client,
    body: &serde_json::Value,
    auth_token: &str, // ✅ Pass auth token
) -> Result<reqwest::Response, String> {
    let mut attempts = 0;
    while attempts < MAX_RETRIES {
        let response = client
            .post(GRAPHQL_URL)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", auth_token)) // ✅ Add Auth Header
            .json(body)
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => {
                return Ok(resp);
            }
            Ok(resp) if resp.status() == reqwest::StatusCode::TOO_MANY_REQUESTS => {
                let delay = (2_u64).pow(attempts);
                warn!("Rate limited. Retrying in {:?} seconds...", delay);
                sleep(Duration::from_secs(delay)).await;
            }
            Ok(resp) => {
                return Err(format!(
                    "Request failed with status: {} {:?}",
                    resp.status(),
                    resp.text().await.unwrap()
                ));
            }
            Err(err) => {
                warn!("Network error: {}. Retrying...", err);
                sleep(Duration::from_secs((2_u64).pow(attempts))).await;
            }
        }
        attempts += 1;
    }
    Err("Max retries reached".to_string())
}

async fn fetch_series_scores(
    client: &Client,
    fetch_series_id: &str,
    auth_token: &str,
) -> Result<(i32, i32), String> {
    let graphql_query = serde_json::json!({
        "operationName": "GetSeriesPlayersAndResults",
        "variables": { "id": fetch_series_id },
        "query": "
        query GetSeriesPlayersAndResults($id: ID!) {
            seriesState(id: $id) {
                teams {
                    id
                    score
                    players { id name }
                }
            }
        }"
    });

    let response = client
        .post("https://api.grid.gg/live-data-feed/series-state/graphql")
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", auth_token))
        .json(&graphql_query)
        .send()
        .await
        .map_err(|err| err.to_string())?;

    if !response.status().is_success() {
        return Err(format!(
            "GraphQL request failed with status: {}",
            response.status()
        ));
    }

    let json: Value = response.json().await.map_err(|err| err.to_string())?;

    // ✅ Extract Scores
    let teams = json["data"]["seriesState"]["teams"]
        .as_array()
        .ok_or("Invalid GraphQL response format")?;

    if teams.len() < 2 {
        return Err("Not enough teams in series data".to_string());
    }

    let team1_score_val = teams[0]["score"].as_i64().map(|s| s as i32).unwrap_or(0);
    let team2_score_val = teams[1]["score"].as_i64().map(|s| s as i32).unwrap_or(0);

    Ok((team1_score_val, team2_score_val))
}
