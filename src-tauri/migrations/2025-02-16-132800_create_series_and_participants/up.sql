-- Create the "series" table
CREATE TABLE series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id TEXT NOT NULL,
    finished BOOLEAN NOT NULL,
    start_time_scheduled TEXT,
    patch TEXT NOT NULL,
    team1_id TEXT,
    team1_score INTEGER,
    team1_name TEXT,
    team1_logo TEXT,
    team2_id TEXT,
    team2_score INTEGER,
    team2_name TEXT,
    team2_logo TEXT
);

-- Create the "participants" table
CREATE TABLE participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    champion_name TEXT NOT NULL,
    stats_json TEXT NOT NULL
);

-- Create the "event_logs" table
CREATE TABLE event_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id TEXT NOT NULL,
    event_log TEXT NOT NULL
);
