// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde_json::json;
use tauri::command;


fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![login,logout])
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

    // Collect all "Set-Cookie" headers
    let cookies: Vec<String> = response
        .headers()
        .get_all("Set-Cookie")
        .iter()
        .filter_map(|cookie| cookie.to_str().ok().map(|s| s.to_owned()))
        .collect();

    if cookies.is_empty() {
        Err("No Set-Cookie headers found".to_string())
    } else {
        // Combine cookies into a single string for easier use
        let cookie_header = cookies.join("; ");

        // Return the combined cookies as a single string
        Ok(cookie_header)
    }
}



#[command]
async fn logout(auth_token: String,refresh_token:String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://lol.grid.gg/auth/logout")
        .header("Cookie", format!("Authorization={}; RefreshToken={}", auth_token,refresh_token))
        .send()
        .await
        .map_err(|err| err.to_string())?;

    if response.status().is_success() {
        Ok("Logged Out".to_string())
    } else {
        Err(format!(
            "Logout failed with status code: {}",
            response.status()
        ))
    }
}