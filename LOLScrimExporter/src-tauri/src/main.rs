// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde_json::json;
use tauri::command;


fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![login])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[command]
async fn login(username: String, password: String) -> Result<String, String> {
    // Build the login payload
    let raw_data = json!({
        "loginId": username,
        "password": password
    });

    // Send the POST request using reqwest
    let client = reqwest::Client::new();
    let response = client
        .post("https://lol.grid.gg/auth/login")
        .json(&raw_data)
        .send()
        .await
        .map_err(|err| err.to_string())?;

    // Check for the "Set-Cookie" header
    if let Some(cookie) = response.headers().get("Set-Cookie") {
        let auth_token = cookie
            .to_str()
            .map_err(|_| "Failed to parse Set-Cookie header".to_string())?
            .split(';')
            .find(|s| s.starts_with("Authorization="))
            .map(|s| s.replace("Authorization=", ""))
            .ok_or("Authorization token not found".to_string())?;

        Ok(auth_token)
    } else {
        Err("Login failed: No Set-Cookie header found".to_string())
    }
}