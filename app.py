"""
Football Sports Academy Management System — Flask JSON API Backend.
Connects to MySQL database `football_academy` via mysql-connector-python.
All SQL uses parameterized queries.
"""
from __future__ import annotations

import os
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any

import mysql.connector
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from mysql.connector import Error

load_dotenv()

app = Flask(__name__, template_folder="templates", static_folder="app/static")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

DB_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "localhost"),
    "port": int(os.getenv("MYSQL_PORT", 3306)),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", "1234"),
    "database": os.getenv("MYSQL_DATABASE", "football_academy"),
}


# -----------------------------------------------------------------------------
# Database helpers
# -----------------------------------------------------------------------------

def get_db_connection():
    """Return a new MySQL connection using dictionary cursor."""
    return mysql.connector.connect(**DB_CONFIG)


def serialize_value(value: Any) -> Any:
    """Convert MySQL types to JSON-serializable values."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat(sep=" ", timespec="seconds")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, time):
        return value.isoformat()
    if isinstance(value, timedelta):
        total = int(value.total_seconds())
        hours, rem = divmod(total, 3600)
        minutes, seconds = divmod(rem, 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    if isinstance(value, Decimal):
        return float(value)
    return value


def serialize_row(row: dict[str, Any]) -> dict[str, Any]:
    return {key: serialize_value(val) for key, val in row.items()}


def serialize_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [serialize_row(row) for row in rows]


def api_response(data: Any = None, message: str = "success", status: int = 200):
    payload = {"success": status < 400, "message": message}
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status


def api_error(message: str, status: int = 400):
    return api_response(message=message, status=status)


def get_json_body() -> dict[str, Any]:
    if not request.is_json:
        return {}
    return request.get_json(silent=True) or {}


def fetch_one(query: str, params: tuple = ()) -> dict[str, Any] | None:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params)
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def fetch_all(query: str, params: tuple = ()) -> list[dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def execute_write(query: str, params: tuple = ()) -> int:
    """Execute INSERT/UPDATE/DELETE and return lastrowid or rowcount."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(query, params)
        conn.commit()
        return cursor.lastrowid if cursor.lastrowid else cursor.rowcount
    except Error:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


# -----------------------------------------------------------------------------
# Dashboard
# -----------------------------------------------------------------------------

@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    """Return overview stats for the academy dashboard."""
    try:
        stats = fetch_one(
            """
            SELECT
                (SELECT COUNT(*) FROM Players) AS total_players,
                (SELECT COUNT(*) FROM Coaches) AS total_coaches,
                (SELECT COUNT(*) FROM Matches
                    WHERE match_date >= CURDATE()) AS upcoming_matches,
                (SELECT COUNT(*) FROM Payments
                    WHERE status IN ('overdue', 'pending')) AS unpaid_payments_count
            """
        )
        return api_response(serialize_row(stats))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


# -----------------------------------------------------------------------------
# Coaches CRUD
# -----------------------------------------------------------------------------

COACH_FIELDS = (
    "first_name", "last_name", "email", "phone",
    "specialization", "hire_date", "salary", "status",
)
COACH_REQUIRED = (
    "first_name", "last_name", "email", "phone",
    "specialization", "hire_date", "salary",
)


@app.route("/api/coaches", methods=["GET"])
def list_coaches():
    try:
        rows = fetch_all("SELECT * FROM Coaches ORDER BY coach_id")
        return api_response(serialize_rows(rows))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/coaches/<int:coach_id>", methods=["GET"])
def get_coach(coach_id: int):
    try:
        row = fetch_one("SELECT * FROM Coaches WHERE coach_id = %s", (coach_id,))
        if not row:
            return api_error("Coach not found", 404)
        return api_response(serialize_row(row))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/coaches", methods=["POST"])
def create_coach():
    data = get_json_body()
    missing = [f for f in COACH_REQUIRED if f not in data or data[f] in (None, "")]
    if missing:
        return api_error(f"Missing required fields: {', '.join(missing)}")

    status = data.get("status", "active")
    try:
        coach_id = execute_write(
            """
            INSERT INTO Coaches
                (first_name, last_name, email, phone, specialization, hire_date, salary, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                data["first_name"], data["last_name"], data["email"], data["phone"],
                data["specialization"], data["hire_date"], data["salary"], status,
            ),
        )
        row = fetch_one("SELECT * FROM Coaches WHERE coach_id = %s", (coach_id,))
        return api_response(serialize_row(row), "Coach created", 201)
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/coaches/<int:coach_id>", methods=["PUT"])
def update_coach(coach_id: int):
    data = get_json_body()
    if not data:
        return api_error("Request body is required")

    updates = {k: data[k] for k in COACH_FIELDS if k in data}
    if not updates:
        return api_error("No valid fields to update")

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    params = tuple(updates.values()) + (coach_id,)
    try:
        affected = execute_write(
            f"UPDATE Coaches SET {set_clause} WHERE coach_id = %s",
            params,
        )
        if not affected:
            return api_error("Coach not found", 404)
        row = fetch_one("SELECT * FROM Coaches WHERE coach_id = %s", (coach_id,))
        return api_response(serialize_row(row), "Coach updated")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/coaches/<int:coach_id>", methods=["DELETE"])
def delete_coach(coach_id: int):
    try:
        affected = execute_write("DELETE FROM Coaches WHERE coach_id = %s", (coach_id,))
        if not affected:
            return api_error("Coach not found", 404)
        return api_response(message="Coach deleted")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


# -----------------------------------------------------------------------------
# Teams CRUD
# -----------------------------------------------------------------------------

TEAM_FIELDS = ("team_name", "age_group", "coach_id", "founded_year", "max_players")
TEAM_REQUIRED = ("team_name", "age_group", "coach_id", "founded_year")


@app.route("/api/teams", methods=["GET"])
def list_teams():
    try:
        rows = fetch_all(
            """
            SELECT t.*, CONCAT(c.first_name, ' ', c.last_name) AS coach_name
            FROM Teams t
            LEFT JOIN Coaches c ON t.coach_id = c.coach_id
            ORDER BY t.team_id
            """
        )
        return api_response(serialize_rows(rows))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/teams/<int:team_id>", methods=["GET"])
def get_team(team_id: int):
    try:
        row = fetch_one(
            """
            SELECT t.*, CONCAT(c.first_name, ' ', c.last_name) AS coach_name
            FROM Teams t
            LEFT JOIN Coaches c ON t.coach_id = c.coach_id
            WHERE t.team_id = %s
            """,
            (team_id,),
        )
        if not row:
            return api_error("Team not found", 404)
        return api_response(serialize_row(row))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/teams", methods=["POST"])
def create_team():
    data = get_json_body()
    missing = [f for f in TEAM_REQUIRED if f not in data or data[f] in (None, "")]
    if missing:
        return api_error(f"Missing required fields: {', '.join(missing)}")

    max_players = data.get("max_players", 22)
    try:
        team_id = execute_write(
            """
            INSERT INTO Teams (team_name, age_group, coach_id, founded_year, max_players)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (data["team_name"], data["age_group"], data["coach_id"], data["founded_year"], max_players),
        )
        row = fetch_one("SELECT * FROM Teams WHERE team_id = %s", (team_id,))
        return api_response(serialize_row(row), "Team created", 201)
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/teams/<int:team_id>", methods=["PUT"])
def update_team(team_id: int):
    data = get_json_body()
    if not data:
        return api_error("Request body is required")

    updates = {k: data[k] for k in TEAM_FIELDS if k in data}
    if not updates:
        return api_error("No valid fields to update")

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    params = tuple(updates.values()) + (team_id,)
    try:
        affected = execute_write(f"UPDATE Teams SET {set_clause} WHERE team_id = %s", params)
        if not affected:
            return api_error("Team not found", 404)
        row = fetch_one("SELECT * FROM Teams WHERE team_id = %s", (team_id,))
        return api_response(serialize_row(row), "Team updated")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/teams/<int:team_id>", methods=["DELETE"])
def delete_team(team_id: int):
    try:
        affected = execute_write("DELETE FROM Teams WHERE team_id = %s", (team_id,))
        if not affected:
            return api_error("Team not found", 404)
        return api_response(message="Team deleted")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


# -----------------------------------------------------------------------------
# Players CRUD
# -----------------------------------------------------------------------------

PLAYER_FIELDS = (
    "first_name", "last_name", "date_of_birth", "email", "phone",
    "position", "jersey_number", "team_id", "registration_date", "status",
)
PLAYER_REQUIRED = (
    "first_name", "last_name", "date_of_birth", "email", "phone",
    "position", "jersey_number", "team_id", "registration_date",
)


@app.route("/api/players", methods=["GET"])
def list_players():
    try:
        rows = fetch_all(
            """
            SELECT p.*, t.team_name
            FROM Players p
            LEFT JOIN Teams t ON p.team_id = t.team_id
            ORDER BY p.player_id
            """
        )
        return api_response(serialize_rows(rows))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/players/check-jersey", methods=["GET"])
def check_jersey():
    """Check if a jersey number is already taken in a team."""
    try:
        team_id = request.args.get("team_id", type=int)
        jersey_number = request.args.get("jersey_number", type=int)
        exclude_player_id = request.args.get("exclude_player_id", type=int)
        if not team_id or jersey_number is None:
            return api_response({"taken": False})
        if exclude_player_id:
            row = fetch_one(
                "SELECT player_id FROM Players WHERE team_id = %s AND jersey_number = %s AND player_id != %s",
                (team_id, jersey_number, exclude_player_id),
            )
        else:
            row = fetch_one(
                "SELECT player_id FROM Players WHERE team_id = %s AND jersey_number = %s",
                (team_id, jersey_number),
            )
        return api_response({"taken": row is not None})
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/players/<int:player_id>", methods=["GET"])
def get_player(player_id: int):
    try:
        row = fetch_one(
            """
            SELECT p.*, t.team_name
            FROM Players p
            LEFT JOIN Teams t ON p.team_id = t.team_id
            WHERE p.player_id = %s
            """,
            (player_id,),
        )
        if not row:
            return api_error("Player not found", 404)
        return api_response(serialize_row(row))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/players", methods=["POST"])
def create_player():
    data = get_json_body()
    missing = [f for f in PLAYER_REQUIRED if f not in data or data[f] in (None, "")]
    if missing:
        return api_error(f"Missing required fields: {', '.join(missing)}")

    status = data.get("status", "active")
    try:
        player_id = execute_write(
            """
            INSERT INTO Players
                (first_name, last_name, date_of_birth, email, phone, position,
                 jersey_number, team_id, registration_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                data["first_name"], data["last_name"], data["date_of_birth"],
                data["email"], data["phone"], data["position"], data["jersey_number"],
                data["team_id"], data["registration_date"], status,
            ),
        )
        row = fetch_one("SELECT * FROM Players WHERE player_id = %s", (player_id,))
        return api_response(serialize_row(row), "Player created", 201)
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/players/<int:player_id>", methods=["PUT"])
def update_player(player_id: int):
    data = get_json_body()
    if not data:
        return api_error("Request body is required")

    updates = {k: data[k] for k in PLAYER_FIELDS if k in data}
    if not updates:
        return api_error("No valid fields to update")

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    params = tuple(updates.values()) + (player_id,)
    try:
        affected = execute_write(f"UPDATE Players SET {set_clause} WHERE player_id = %s", params)
        if not affected:
            return api_error("Player not found", 404)
        row = fetch_one("SELECT * FROM Players WHERE player_id = %s", (player_id,))
        return api_response(serialize_row(row), "Player updated")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/players/<int:player_id>", methods=["DELETE"])
def delete_player(player_id: int):
    try:
        affected = execute_write("DELETE FROM Players WHERE player_id = %s", (player_id,))
        if not affected:
            return api_error("Player not found", 404)
        return api_response(message="Player deleted")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


# -----------------------------------------------------------------------------
# Training Sessions CRUD
# -----------------------------------------------------------------------------

SESSION_FIELDS = (
    "team_id", "coach_id", "session_date", "start_time",
    "end_time", "location", "focus_area", "status",
)
SESSION_REQUIRED = (
    "team_id", "coach_id", "session_date", "start_time",
    "end_time", "location", "focus_area",
)


@app.route("/api/training-sessions", methods=["GET"])
def list_training_sessions():
    try:
        rows = fetch_all(
            """
            SELECT ts.*, t.team_name,
                   CONCAT(c.first_name, ' ', c.last_name) AS coach_name
            FROM Training_Sessions ts
            LEFT JOIN Teams t ON ts.team_id = t.team_id
            LEFT JOIN Coaches c ON ts.coach_id = c.coach_id
            ORDER BY ts.session_date DESC, ts.start_time
            """
        )
        return api_response(serialize_rows(rows))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/training-sessions/<int:session_id>", methods=["GET"])
def get_training_session(session_id: int):
    try:
        row = fetch_one(
            """
            SELECT ts.*, t.team_name,
                   CONCAT(c.first_name, ' ', c.last_name) AS coach_name
            FROM Training_Sessions ts
            LEFT JOIN Teams t ON ts.team_id = t.team_id
            LEFT JOIN Coaches c ON ts.coach_id = c.coach_id
            WHERE ts.session_id = %s
            """,
            (session_id,),
        )
        if not row:
            return api_error("Training session not found", 404)
        return api_response(serialize_row(row))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/training-sessions", methods=["POST"])
def create_training_session():
    data = get_json_body()
    missing = [f for f in SESSION_REQUIRED if f not in data or data[f] in (None, "")]
    if missing:
        return api_error(f"Missing required fields: {', '.join(missing)}")

    status = data.get("status", "scheduled")
    try:
        session_id = execute_write(
            """
            INSERT INTO Training_Sessions
                (team_id, coach_id, session_date, start_time, end_time, location, focus_area, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                data["team_id"], data["coach_id"], data["session_date"],
                data["start_time"], data["end_time"], data["location"],
                data["focus_area"], status,
            ),
        )
        row = fetch_one("SELECT * FROM Training_Sessions WHERE session_id = %s", (session_id,))
        return api_response(serialize_row(row), "Training session created", 201)
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/training-sessions/<int:session_id>", methods=["PUT"])
def update_training_session(session_id: int):
    data = get_json_body()
    if not data:
        return api_error("Request body is required")

    updates = {k: data[k] for k in SESSION_FIELDS if k in data}
    if not updates:
        return api_error("No valid fields to update")

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    params = tuple(updates.values()) + (session_id,)
    try:
        affected = execute_write(
            f"UPDATE Training_Sessions SET {set_clause} WHERE session_id = %s",
            params,
        )
        if not affected:
            return api_error("Training session not found", 404)
        row = fetch_one("SELECT * FROM Training_Sessions WHERE session_id = %s", (session_id,))
        return api_response(serialize_row(row), "Training session updated")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/training-sessions/<int:session_id>", methods=["DELETE"])
def delete_training_session(session_id: int):
    try:
        affected = execute_write(
            "DELETE FROM Training_Sessions WHERE session_id = %s",
            (session_id,),
        )
        if not affected:
            return api_error("Training session not found", 404)
        return api_response(message="Training session deleted")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


# -----------------------------------------------------------------------------
# Attendance CRUD
# -----------------------------------------------------------------------------

ATTENDANCE_FIELDS = ("session_id", "player_id", "status", "notes")
ATTENDANCE_REQUIRED = ("session_id", "player_id", "status")


@app.route("/api/attendance", methods=["GET"])
def list_attendance():
    try:
        rows = fetch_all(
            """
            SELECT a.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS player_name,
                   ts.session_date, ts.focus_area, t.team_name
            FROM Attendance a
            LEFT JOIN Players p ON a.player_id = p.player_id
            LEFT JOIN Training_Sessions ts ON a.session_id = ts.session_id
            LEFT JOIN Teams t ON ts.team_id = t.team_id
            ORDER BY a.attendance_id
            """
        )
        return api_response(serialize_rows(rows))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/attendance/<int:attendance_id>", methods=["GET"])
def get_attendance(attendance_id: int):
    try:
        row = fetch_one(
            """
            SELECT a.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS player_name,
                   ts.session_date, ts.focus_area
            FROM Attendance a
            LEFT JOIN Players p ON a.player_id = p.player_id
            LEFT JOIN Training_Sessions ts ON a.session_id = ts.session_id
            WHERE a.attendance_id = %s
            """,
            (attendance_id,),
        )
        if not row:
            return api_error("Attendance record not found", 404)
        return api_response(serialize_row(row))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/attendance", methods=["POST"])
def create_attendance():
    data = get_json_body()
    missing = [f for f in ATTENDANCE_REQUIRED if f not in data or data[f] in (None, "")]
    if missing:
        return api_error(f"Missing required fields: {', '.join(missing)}")

    notes = data.get("notes")
    try:
        attendance_id = execute_write(
            """
            INSERT INTO Attendance (session_id, player_id, status, notes)
            VALUES (%s, %s, %s, %s)
            """,
            (data["session_id"], data["player_id"], data["status"], notes),
        )
        row = fetch_one("SELECT * FROM Attendance WHERE attendance_id = %s", (attendance_id,))
        return api_response(serialize_row(row), "Attendance record created", 201)
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/attendance/<int:attendance_id>", methods=["PUT"])
def update_attendance(attendance_id: int):
    data = get_json_body()
    if not data:
        return api_error("Request body is required")

    updates = {k: data[k] for k in ATTENDANCE_FIELDS if k in data}
    if not updates:
        return api_error("No valid fields to update")

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    params = tuple(updates.values()) + (attendance_id,)
    try:
        affected = execute_write(
            f"UPDATE Attendance SET {set_clause} WHERE attendance_id = %s",
            params,
        )
        if not affected:
            return api_error("Attendance record not found", 404)
        row = fetch_one("SELECT * FROM Attendance WHERE attendance_id = %s", (attendance_id,))
        return api_response(serialize_row(row), "Attendance record updated")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/attendance/<int:attendance_id>", methods=["DELETE"])
def delete_attendance(attendance_id: int):
    try:
        affected = execute_write(
            "DELETE FROM Attendance WHERE attendance_id = %s",
            (attendance_id,),
        )
        if not affected:
            return api_error("Attendance record not found", 404)
        return api_response(message="Attendance record deleted")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


# -----------------------------------------------------------------------------
# Matches CRUD
# -----------------------------------------------------------------------------

MATCH_FIELDS = (
    "team_id", "opponent_name", "match_date", "kickoff_time", "venue_type",
    "location", "home_score", "away_score", "status", "result",
)
MATCH_REQUIRED = (
    "team_id", "opponent_name", "match_date", "kickoff_time", "venue_type", "location",
)


@app.route("/api/matches", methods=["GET"])
def list_matches():
    try:
        rows = fetch_all(
            """
            SELECT m.*, t.team_name
            FROM Matches m
            LEFT JOIN Teams t ON m.team_id = t.team_id
            ORDER BY m.match_date DESC, m.kickoff_time
            """
        )
        return api_response(serialize_rows(rows))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/matches/<int:match_id>", methods=["GET"])
def get_match(match_id: int):
    try:
        row = fetch_one(
            """
            SELECT m.*, t.team_name
            FROM Matches m
            LEFT JOIN Teams t ON m.team_id = t.team_id
            WHERE m.match_id = %s
            """,
            (match_id,),
        )
        if not row:
            return api_error("Match not found", 404)
        return api_response(serialize_row(row))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/matches", methods=["POST"])
def create_match():
    data = get_json_body()
    missing = [f for f in MATCH_REQUIRED if f not in data or data[f] in (None, "")]
    if missing:
        return api_error(f"Missing required fields: {', '.join(missing)}")

    status = data.get("status", "scheduled")
    result = data.get("result", "pending")
    home_score = data.get("home_score")
    away_score = data.get("away_score")
    try:
        match_id = execute_write(
            """
            INSERT INTO Matches
                (team_id, opponent_name, match_date, kickoff_time, venue_type,
                 location, home_score, away_score, status, result)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                data["team_id"], data["opponent_name"], data["match_date"],
                data["kickoff_time"], data["venue_type"], data["location"],
                home_score, away_score, status, result,
            ),
        )
        row = fetch_one("SELECT * FROM Matches WHERE match_id = %s", (match_id,))
        return api_response(serialize_row(row), "Match created", 201)
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/matches/<int:match_id>", methods=["PUT"])
def update_match(match_id: int):
    data = get_json_body()
    if not data:
        return api_error("Request body is required")

    updates = {k: data[k] for k in MATCH_FIELDS if k in data}
    if not updates:
        return api_error("No valid fields to update")

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    params = tuple(updates.values()) + (match_id,)
    try:
        affected = execute_write(f"UPDATE Matches SET {set_clause} WHERE match_id = %s", params)
        if not affected:
            return api_error("Match not found", 404)
        row = fetch_one("SELECT * FROM Matches WHERE match_id = %s", (match_id,))
        return api_response(serialize_row(row), "Match updated")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/matches/<int:match_id>", methods=["DELETE"])
def delete_match(match_id: int):
    try:
        affected = execute_write("DELETE FROM Matches WHERE match_id = %s", (match_id,))
        if not affected:
            return api_error("Match not found", 404)
        return api_response(message="Match deleted")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


# -----------------------------------------------------------------------------
# Payments CRUD
# -----------------------------------------------------------------------------

PAYMENT_FIELDS = (
    "player_id", "amount", "due_date", "paid_date",
    "payment_type", "status", "notes",
)
PAYMENT_REQUIRED = ("player_id", "amount", "due_date", "payment_type")


@app.route("/api/payments", methods=["GET"])
def list_payments():
    try:
        rows = fetch_all(
            """
            SELECT pay.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS player_name,
                   t.team_name
            FROM Payments pay
            LEFT JOIN Players p ON pay.player_id = p.player_id
            LEFT JOIN Teams t ON p.team_id = t.team_id
            ORDER BY pay.due_date DESC
            """
        )
        return api_response(serialize_rows(rows))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/payments/<int:payment_id>", methods=["GET"])
def get_payment(payment_id: int):
    try:
        row = fetch_one(
            """
            SELECT pay.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS player_name
            FROM Payments pay
            LEFT JOIN Players p ON pay.player_id = p.player_id
            WHERE pay.payment_id = %s
            """,
            (payment_id,),
        )
        if not row:
            return api_error("Payment not found", 404)
        return api_response(serialize_row(row))
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/payments", methods=["POST"])
def create_payment():
    data = get_json_body()
    missing = [f for f in PAYMENT_REQUIRED if f not in data or data[f] in (None, "")]
    if missing:
        return api_error(f"Missing required fields: {', '.join(missing)}")

    status = data.get("status", "pending")
    paid_date = data.get("paid_date")
    notes = data.get("notes")

    if paid_date:
        from datetime import date
        try:
            pd = date.fromisoformat(paid_date)
            if pd > date.today():
                return api_error("Paid date cannot be a future date.")
        except ValueError:
            return api_error("Invalid paid_date format.")

    try:
        payment_id = execute_write(
            """
            INSERT INTO Payments
                (player_id, amount, due_date, paid_date, payment_type, status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                data["player_id"], data["amount"], data["due_date"],
                paid_date, data["payment_type"], status, notes,
            ),
        )
        row = fetch_one("SELECT * FROM Payments WHERE payment_id = %s", (payment_id,))
        return api_response(serialize_row(row), "Payment created", 201)
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/payments/<int:payment_id>", methods=["PUT"])
def update_payment(payment_id: int):
    data = get_json_body()
    if not data:
        return api_error("Request body is required")

    updates = {k: data[k] for k in PAYMENT_FIELDS if k in data}
    if not updates:
        return api_error("No valid fields to update")

    if "paid_date" in updates and updates["paid_date"]:
        from datetime import date
        try:
            pd = date.fromisoformat(updates["paid_date"])
            if pd > date.today():
                return api_error("Paid date cannot be a future date.")
        except ValueError:
            return api_error("Invalid paid_date format.")

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    params = tuple(updates.values()) + (payment_id,)
    try:
        affected = execute_write(f"UPDATE Payments SET {set_clause} WHERE payment_id = %s", params)
        if not affected:
            return api_error("Payment not found", 404)
        row = fetch_one("SELECT * FROM Payments WHERE payment_id = %s", (payment_id,))
        return api_response(serialize_row(row), "Payment updated")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


@app.route("/api/payments/<int:payment_id>", methods=["DELETE"])
def delete_payment(payment_id: int):
    try:
        affected = execute_write("DELETE FROM Payments WHERE payment_id = %s", (payment_id,))
        if not affected:
            return api_error("Payment not found", 404)
        return api_response(message="Payment deleted")
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


# -----------------------------------------------------------------------------
# Frontend pages
# -----------------------------------------------------------------------------

@app.route("/")
def page_dashboard():
    return render_template("dashboard/index.html", active_page="dashboard")


@app.route("/players")
def page_players():
    return render_template("players/list.html", active_page="players")


@app.route("/coaches")
def page_coaches():
    return render_template("coaches/list.html", active_page="coaches")


@app.route("/teams")
def page_teams():
    return render_template("teams/list.html", active_page="teams")


@app.route("/training-sessions")
def page_training():
    return render_template("training/schedule.html", active_page="training")


@app.route("/matches")
def page_matches():
    return render_template("matches/list.html", active_page="matches")


@app.route("/payments")
def page_payments():
    return render_template("payments/list.html", active_page="payments")


# -----------------------------------------------------------------------------
# Global Search
# -----------------------------------------------------------------------------

@app.route("/api/search", methods=["GET"])
def global_search():
    q = request.args.get("q", "").strip()
    if not q or len(q) < 2:
        return api_response({"players": [], "coaches": [], "matches": [], "payments": []})
    like = f"%{q}%"
    try:
        players = fetch_all(
            """
            SELECT p.player_id, p.first_name, p.last_name, p.position, t.team_name
            FROM Players p
            LEFT JOIN Teams t ON p.team_id = t.team_id
            WHERE p.first_name LIKE %s OR p.last_name LIKE %s
               OR p.position LIKE %s OR t.team_name LIKE %s
            LIMIT 5
            """,
            (like, like, like, like),
        )
        coaches = fetch_all(
            """
            SELECT coach_id, first_name, last_name, specialization
            FROM Coaches
            WHERE first_name LIKE %s OR last_name LIKE %s OR specialization LIKE %s
            LIMIT 5
            """,
            (like, like, like),
        )
        matches = fetch_all(
            """
            SELECT m.match_id, m.opponent_name, m.match_date, m.status, t.team_name
            FROM Matches m
            LEFT JOIN Teams t ON m.team_id = t.team_id
            WHERE m.opponent_name LIKE %s OR t.team_name LIKE %s OR m.status LIKE %s
            LIMIT 5
            """,
            (like, like, like),
        )
        payments = fetch_all(
            """
            SELECT pay.payment_id, pay.amount, pay.status, pay.payment_type,
                   CONCAT(p.first_name, ' ', p.last_name) AS player_name
            FROM Payments pay
            LEFT JOIN Players p ON pay.player_id = p.player_id
            WHERE p.first_name LIKE %s OR p.last_name LIKE %s OR pay.payment_type LIKE %s
            LIMIT 5
            """,
            (like, like, like),
        )
        return api_response({
            "players": serialize_rows(players),
            "coaches": serialize_rows(coaches),
            "matches": serialize_rows(matches),
            "payments": serialize_rows(payments),
        })
    except Error as exc:
        return api_error(f"Database error: {exc}", 500)


# -----------------------------------------------------------------------------
# Health check
# -----------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health_check():
    try:
        fetch_one("SELECT 1 AS ok")
        return api_response({"database": "connected"})
    except Error as exc:
        return api_error(f"Database connection failed: {exc}", 503)


# -----------------------------------------------------------------------------
# Entry point
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
