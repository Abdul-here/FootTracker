-- =============================================================================
-- Football Sports Academy Management System
-- Complete MySQL Database Script
-- Tables: Players, Coaches, Teams, Training_Sessions, Attendance, Matches, Payments
-- Run:  mysql -u root -p < database/database.sql
-- =============================================================================

DROP DATABASE IF EXISTS football_academy;
CREATE DATABASE football_academy
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE football_academy;

-- -----------------------------------------------------------------------------
-- DROP TABLES (dependency order)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS Attendance;
DROP TABLE IF EXISTS Payments;
DROP TABLE IF EXISTS Matches;
DROP TABLE IF EXISTS Training_Sessions;
DROP TABLE IF EXISTS Players;
DROP TABLE IF EXISTS Teams;
DROP TABLE IF EXISTS Coaches;

-- -----------------------------------------------------------------------------
-- TABLE: Coaches
-- -----------------------------------------------------------------------------
CREATE TABLE Coaches (
    coach_id        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    first_name      VARCHAR(50)     NOT NULL,
    last_name       VARCHAR(50)     NOT NULL,
    email           VARCHAR(120)    NOT NULL,
    phone           VARCHAR(20)     NOT NULL,
    specialization  VARCHAR(80)     NOT NULL,
    hire_date       DATE            NOT NULL,
    salary          DECIMAL(10, 2)  NOT NULL,
    status          ENUM('active', 'on_leave', 'inactive') NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (coach_id),
    UNIQUE KEY uq_coaches_email (email),
    CONSTRAINT chk_coaches_salary CHECK (salary >= 0),
    CONSTRAINT chk_coaches_hire_date CHECK (hire_date >= '2000-01-01' AND hire_date <= '2099-12-31')
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- TABLE: Teams
-- -----------------------------------------------------------------------------
CREATE TABLE Teams (
    team_id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    team_name       VARCHAR(80)     NOT NULL,
    age_group       VARCHAR(20)     NOT NULL,
    coach_id        INT UNSIGNED    NOT NULL,
    founded_year    YEAR            NOT NULL,
    max_players     TINYINT UNSIGNED NOT NULL DEFAULT 22,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id),
    UNIQUE KEY uq_teams_name (team_name),
    CONSTRAINT fk_teams_coach
        FOREIGN KEY (coach_id) REFERENCES Coaches (coach_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_teams_max_players CHECK (max_players BETWEEN 11 AND 30),
    CONSTRAINT chk_teams_founded_year CHECK (founded_year BETWEEN 1990 AND 2026)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- TABLE: Players
-- -----------------------------------------------------------------------------
CREATE TABLE Players (
    player_id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    first_name          VARCHAR(50)     NOT NULL,
    last_name           VARCHAR(50)     NOT NULL,
    date_of_birth       DATE            NOT NULL,
    email               VARCHAR(120)    NOT NULL,
    phone               VARCHAR(20)     NOT NULL,
    position            ENUM('Goalkeeper', 'Defender', 'Midfielder', 'Forward') NOT NULL,
    jersey_number       TINYINT UNSIGNED NOT NULL,
    team_id             INT UNSIGNED    NOT NULL,
    registration_date   DATE            NOT NULL,
    status              ENUM('active', 'injured', 'inactive') NOT NULL DEFAULT 'active',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id),
    UNIQUE KEY uq_players_email (email),
    UNIQUE KEY uq_players_team_jersey (team_id, jersey_number),
    CONSTRAINT fk_players_team
        FOREIGN KEY (team_id) REFERENCES Teams (team_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_players_jersey CHECK (jersey_number BETWEEN 1 AND 99),
    CONSTRAINT chk_players_dob CHECK (date_of_birth >= '2000-01-01' AND date_of_birth <= '2020-12-31')
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- TABLE: Training_Sessions
-- -----------------------------------------------------------------------------
CREATE TABLE Training_Sessions (
    session_id      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    team_id         INT UNSIGNED    NOT NULL,
    coach_id        INT UNSIGNED    NOT NULL,
    session_date    DATE            NOT NULL,
    start_time      TIME            NOT NULL,
    end_time        TIME            NOT NULL,
    location        VARCHAR(120)    NOT NULL,
    focus_area      VARCHAR(100)    NOT NULL,
    status          ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id),
    CONSTRAINT fk_sessions_team
        FOREIGN KEY (team_id) REFERENCES Teams (team_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sessions_coach
        FOREIGN KEY (coach_id) REFERENCES Coaches (coach_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_sessions_time CHECK (end_time > start_time)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- TABLE: Attendance
-- -----------------------------------------------------------------------------
CREATE TABLE Attendance (
    attendance_id   INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    session_id      INT UNSIGNED    NOT NULL,
    player_id       INT UNSIGNED    NOT NULL,
    status          ENUM('present', 'absent', 'late', 'excused') NOT NULL,
    notes           VARCHAR(255)    NULL,
    recorded_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (attendance_id),
    UNIQUE KEY uq_attendance_session_player (session_id, player_id),
    CONSTRAINT fk_attendance_session
        FOREIGN KEY (session_id) REFERENCES Training_Sessions (session_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_attendance_player
        FOREIGN KEY (player_id) REFERENCES Players (player_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- TABLE: Matches
-- -----------------------------------------------------------------------------
CREATE TABLE Matches (
    match_id        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    team_id         INT UNSIGNED    NOT NULL,
    opponent_name   VARCHAR(80)     NOT NULL,
    match_date      DATE            NOT NULL,
    kickoff_time    TIME            NOT NULL,
    venue_type      ENUM('home', 'away') NOT NULL,
    location        VARCHAR(120)    NOT NULL,
    home_score      TINYINT UNSIGNED NULL,
    away_score      TINYINT UNSIGNED NULL,
    status          ENUM('scheduled', 'completed', 'postponed', 'cancelled') NOT NULL DEFAULT 'scheduled',
    result          ENUM('win', 'draw', 'loss', 'pending') NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (match_id),
    CONSTRAINT fk_matches_team
        FOREIGN KEY (team_id) REFERENCES Teams (team_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_matches_scores CHECK (
        (status = 'completed' AND home_score IS NOT NULL AND away_score IS NOT NULL)
        OR (status <> 'completed')
    )
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- TABLE: Payments
-- -----------------------------------------------------------------------------
CREATE TABLE Payments (
    payment_id      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    player_id       INT UNSIGNED    NOT NULL,
    amount          DECIMAL(10, 2)  NOT NULL,
    due_date        DATE            NOT NULL,
    paid_date       DATE            NULL,
    payment_type    ENUM('monthly_fee', 'registration', 'equipment', 'tournament') NOT NULL,
    status          ENUM('pending', 'paid', 'overdue', 'partial') NOT NULL DEFAULT 'pending',
    notes           VARCHAR(255)    NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (payment_id),
    CONSTRAINT fk_payments_player
        FOREIGN KEY (player_id) REFERENCES Players (player_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_payments_amount CHECK (amount > 0),
    CONSTRAINT chk_payments_paid_date CHECK (paid_date IS NULL OR paid_date >= due_date - INTERVAL 30 DAY)
) ENGINE=InnoDB;

-- =============================================================================
-- SAMPLE DATA (15–20 rows per table)
-- =============================================================================

-- Coaches (15 rows)
INSERT INTO Coaches (first_name, last_name, email, phone, specialization, hire_date, salary, status) VALUES
('Marcus',   'Hughes',    'marcus.hughes@academy.com',    '+44-7700-900101', 'Youth Development',   '2018-03-15', 42000.00, 'active'),
('Elena',    'Vasquez',   'elena.vasquez@academy.com',    '+44-7700-900102', 'Goalkeeping',         '2019-06-01', 38500.00, 'active'),
('James',    'Okafor',    'james.okafor@academy.com',     '+44-7700-900103', 'Tactical Analysis',   '2017-01-10', 45000.00, 'active'),
('Sophie',   'Laurent',   'sophie.laurent@academy.com',   '+44-7700-900104', 'Fitness & Conditioning', '2020-09-14', 36000.00, 'active'),
('David',    'Chen',      'david.chen@academy.com',       '+44-7700-900105', 'Defensive Coaching',  '2016-11-20', 41000.00, 'active'),
('Amara',    'Diallo',    'amara.diallo@academy.com',     '+44-7700-900106', 'Attacking Play',      '2021-02-28', 37500.00, 'active'),
('Robert',   'Fischer',   'robert.fischer@academy.com',   '+44-7700-900107', 'Sports Psychology',   '2019-08-05', 39000.00, 'on_leave'),
('Priya',    'Sharma',    'priya.sharma@academy.com',     '+44-7700-900108', 'Midfield Development','2020-04-18', 37000.00, 'active'),
('Thomas',   'Brennan',   'thomas.brennan@academy.com',   '+44-7700-900109', 'Set Pieces',          '2015-07-22', 44000.00, 'active'),
('Isabella', 'Romero',    'isabella.romero@academy.com',  '+44-7700-900110', 'Women''s Football',   '2022-01-03', 35000.00, 'active'),
('Kevin',    'Walsh',     'kevin.walsh@academy.com',      '+44-7700-900111', 'U-12 Development',    '2018-09-09', 34000.00, 'active'),
('Nadia',    'Petrov',    'nadia.petrov@academy.com',     '+44-7700-900112', 'Speed & Agility',     '2021-11-15', 36500.00, 'active'),
('Chris',    'Morrison',  'chris.morrison@academy.com',   '+44-7700-900113', 'Goalkeeping',         '2017-05-30', 40000.00, 'active'),
('Fatima',   'Al-Rashid', 'fatima.alrashid@academy.com',  '+44-7700-900114', 'Technical Skills',    '2023-03-01', 35500.00, 'active'),
('Liam',     'Gallagher', 'liam.gallagher@academy.com',   '+44-7700-900115', 'Match Preparation',   '2016-02-14', 43000.00, 'inactive');

-- Teams (15 rows)
INSERT INTO Teams (team_name, age_group, coach_id, founded_year, max_players) VALUES
('Academy Lions U-12',      'U-12', 11, 2016, 18),
('Academy Wolves U-12',     'U-12',  1, 2017, 18),
('Rising Stars U-14',       'U-14',  3, 2015, 20),
('Metro Hawks U-14',        'U-14',  5, 2016, 20),
('Elite Strikers U-16',     'U-16',  6, 2014, 22),
('Northern Guardians U-16', 'U-16',  8, 2015, 22),
('City Phoenix U-18',       'U-18',  9, 2013, 24),
('Valley United U-18',      'U-18', 15, 2014, 24),
('Junior Keepers U-12',     'U-12',  2, 2019, 16),
('Midfield Masters U-14',   'U-14',  8, 2018, 20),
('Defensive Unit U-16',     'U-16',  5, 2017, 22),
('Women''s Elite U-16',     'U-16', 10, 2020, 22),
('Pre-Academy U-10',      'U-10', 11, 2021, 16),
('Development Squad U-14',  'U-14', 14, 2022, 20),
('Senior Reserves U-18',    'U-18',  3, 2012, 24);

-- Players (18 rows)
INSERT INTO Players (first_name, last_name, date_of_birth, email, phone, position, jersey_number, team_id, registration_date, status) VALUES
('Oliver',   'Grant',     '2012-04-12', 'oliver.grant@player.com',     '+44-7800-100001', 'Forward',     9,  1, '2024-01-15', 'active'),
('Noah',     'Bennett',   '2012-07-23', 'noah.bennett@player.com',     '+44-7800-100002', 'Midfielder',  8,  1, '2024-01-15', 'active'),
('Ethan',    'Cole',      '2012-11-05', 'ethan.cole@player.com',       '+44-7800-100003', 'Defender',    4,  1, '2024-02-01', 'active'),
('Lucas',    'Hayes',     '2010-03-18', 'lucas.hayes@player.com',      '+44-7800-100004', 'Forward',    10,  3, '2023-09-01', 'active'),
('Mason',    'Reid',      '2010-06-30', 'mason.reid@player.com',       '+44-7800-100005', 'Midfielder',  6,  3, '2023-09-01', 'active'),
('Aiden',    'Foster',    '2010-09-14', 'aiden.foster@player.com',     '+44-7800-100006', 'Defender',    3,  3, '2023-09-01', 'injured'),
('Jackson',  'Pierce',    '2008-02-22', 'jackson.pierce@player.com',   '+44-7800-100007', 'Forward',     7,  5, '2022-08-20', 'active'),
('Sebastian','Brooks',    '2008-05-11', 'sebastian.brooks@player.com', '+44-7800-100008', 'Midfielder', 11,  5, '2022-08-20', 'active'),
('Henry',    'Sullivan',  '2008-08-27', 'henry.sullivan@player.com',   '+44-7800-100009', 'Defender',    5,  5, '2022-08-20', 'active'),
('William',  'Torres',    '2006-01-09', 'william.torres@player.com',   '+44-7800-100010', 'Forward',    14,  7, '2021-07-10', 'active'),
('James',    'Nguyen',    '2006-04-17', 'james.nguyen@player.com',     '+44-7800-100011', 'Midfielder', 10,  7, '2021-07-10', 'active'),
('Benjamin', 'Khan',      '2006-07-03', 'benjamin.khan@player.com',    '+44-7800-100012', 'Goalkeeper',  1,  7, '2021-07-10', 'active'),
('Alexander','Murphy',    '2012-12-01', 'alexander.murphy@player.com', '+44-7800-100013', 'Goalkeeper',  1,  2, '2024-03-10', 'active'),
('Daniel',   'Osei',      '2010-10-25', 'daniel.osei@player.com',      '+44-7800-100014', 'Forward',    17,  4, '2023-11-05', 'active'),
('Matthew',  'Ivanov',    '2010-01-13', 'matthew.ivanov@player.com',   '+44-7800-100015', 'Defender',    2,  4, '2023-11-05', 'active'),
('Joseph',   'Patel',     '2008-11-19', 'joseph.patel@player.com',     '+44-7800-100016', 'Midfielder',  8,  6, '2022-09-12', 'active'),
('Samuel',   'Dubois',    '2006-10-08', 'samuel.dubois@player.com',    '+44-7800-100017', 'Defender',   15,  8, '2021-05-22', 'active'),
('David',    'Anderson',  '2012-08-16', 'david.anderson@player.com',   '+44-7800-100018', 'Forward',    11,  9, '2024-04-01', 'inactive');

-- Training_Sessions (18 rows)
INSERT INTO Training_Sessions (team_id, coach_id, session_date, start_time, end_time, location, focus_area, status) VALUES
( 1, 11, '2025-06-02', '16:00:00', '17:30:00', 'Main Pitch A',      'Passing Drills',           'completed'),
( 1,  1, '2025-06-04', '16:00:00', '17:30:00', 'Main Pitch A',      'Small-Sided Games',        'completed'),
( 3,  3, '2025-06-03', '17:00:00', '18:30:00', 'Main Pitch B',      'Pressing & Transitions',   'completed'),
( 3,  3, '2025-06-05', '17:00:00', '18:30:00', 'Main Pitch B',      'Finishing Practice',       'scheduled'),
( 5,  6, '2025-06-02', '18:00:00', '19:30:00', 'Training Ground 2', 'Attacking Patterns',       'completed'),
( 5,  6, '2025-06-06', '18:00:00', '19:30:00', 'Training Ground 2', 'Set Piece Routines',       'scheduled'),
( 7,  9, '2025-06-03', '19:00:00', '20:30:00', 'Stadium Annex',     'Match Simulation',         'completed'),
( 7, 15, '2025-06-07', '19:00:00', '20:30:00', 'Stadium Annex',     'Tactical Review',          'scheduled'),
( 2,  1, '2025-06-04', '16:30:00', '18:00:00', 'Main Pitch C',      'Ball Control',             'completed'),
( 4,  5, '2025-06-05', '17:30:00', '19:00:00', 'Main Pitch B',      'Defensive Shape',          'scheduled'),
( 6,  8, '2025-06-02', '17:00:00', '18:30:00', 'Training Ground 1', 'Midfield Rotation',        'completed'),
( 8,  3, '2025-06-04', '18:30:00', '20:00:00', 'Training Ground 2', 'Counter Attacking',        'completed'),
( 9,  2, '2025-06-03', '16:00:00', '17:00:00', 'Goalkeeper Zone',   'Shot Stopping',            'completed'),
(10,  8, '2025-06-06', '17:00:00', '18:30:00', 'Main Pitch A',      'Possession Play',          'scheduled'),
(12, 10, '2025-06-05', '18:00:00', '19:30:00', 'Main Pitch C',      'Team Building',            'scheduled'),
(14, 14, '2025-06-07', '16:00:00', '17:30:00', 'Training Ground 1', 'First Touch',              'scheduled'),
(15,  3, '2025-06-08', '10:00:00', '12:00:00', 'Stadium Annex',     'Pre-Season Fitness',       'scheduled'),
( 1, 11, '2025-06-09', '16:00:00', '17:30:00', 'Main Pitch A',      'Recovery Session',         'scheduled');

-- Attendance (20 rows)
INSERT INTO Attendance (session_id, player_id, status, notes) VALUES
( 1,  1, 'present', NULL),
( 1,  2, 'present', NULL),
( 1,  3, 'late',    'Arrived 10 minutes late'),
( 2,  1, 'present', NULL),
( 2,  2, 'absent',  'Family commitment'),
( 2,  3, 'present', NULL),
( 3,  4, 'present', NULL),
( 3,  5, 'present', NULL),
( 3,  6, 'excused', 'Injury — ankle sprain'),
( 5,  7, 'present', NULL),
( 5,  8, 'present', NULL),
( 5,  9, 'late',    'Traffic delay'),
( 7, 10, 'present', NULL),
( 7, 11, 'present', NULL),
( 7, 12, 'present', NULL),
( 9, 13, 'present', NULL),
(11, 16, 'present', NULL),
(12, 17, 'absent',  'School exam'),
(13, 18, 'present', NULL),
( 3, 14, 'present', 'Guest session with U-14 Rising Stars');

-- Matches (18 rows)
INSERT INTO Matches (team_id, opponent_name, match_date, kickoff_time, venue_type, location, home_score, away_score, status, result) VALUES
( 1, 'Eastside Rangers U-12',    '2025-05-10', '10:00:00', 'home', 'Academy Stadium',        3, 1, 'completed', 'win'),
( 1, 'Northfield Colts U-12',    '2025-05-24', '11:00:00', 'away', 'Northfield Sports Park', 2, 2, 'completed', 'draw'),
( 3, 'Westbrook FC U-14',        '2025-05-11', '14:00:00', 'home', 'Academy Stadium',        4, 0, 'completed', 'win'),
( 3, 'Harbour City U-14',        '2025-05-25', '15:00:00', 'away', 'Harbour Arena',          1, 3, 'completed', 'loss'),
( 5, 'Summit Athletic U-16',     '2025-05-12', '16:00:00', 'home', 'Academy Stadium',        2, 1, 'completed', 'win'),
( 5, 'Lakeside United U-16',     '2025-06-14', '16:00:00', 'away', 'Lakeside Ground',        NULL, NULL, 'scheduled', 'pending'),
( 7, 'Capital City Academy U-18','2025-05-13', '18:00:00', 'home', 'Academy Stadium',        3, 2, 'completed', 'win'),
( 7, 'Riverside Rovers U-18',    '2025-06-15', '17:00:00', 'away', 'Riverside Park',         NULL, NULL, 'scheduled', 'pending'),
( 2, 'Parkview Juniors U-12',    '2025-05-17', '10:30:00', 'home', 'Training Ground 1',      1, 0, 'completed', 'win'),
( 4, 'Greenfield FC U-14',       '2025-05-18', '14:30:00', 'away', 'Greenfield Complex',     0, 2, 'completed', 'loss'),
( 6, 'Highland FC U-16',         '2025-05-19', '15:30:00', 'home', 'Academy Stadium',        2, 2, 'completed', 'draw'),
( 8, 'Coastal Warriors U-18',    '2025-05-20', '18:30:00', 'away', 'Coastal Stadium',        1, 4, 'completed', 'loss'),
( 9, 'Goalkeeper Academy U-12',  '2025-05-21', '11:00:00', 'home', 'Goalkeeper Zone',        0, 0, 'completed', 'draw'),
(10, 'Central Midfield U-14',    '2025-06-16', '17:00:00', 'home', 'Main Pitch B',           NULL, NULL, 'scheduled', 'pending'),
(12, 'National Girls U-16',      '2025-05-22', '16:00:00', 'away', 'National Centre',        2, 1, 'completed', 'win'),
(14, 'Future Stars U-14',        '2025-06-17', '15:00:00', 'home', 'Training Ground 1',      NULL, NULL, 'scheduled', 'pending'),
(15, 'Premier Reserves U-18',    '2025-05-23', '19:00:00', 'home', 'Stadium Annex',          5, 1, 'completed', 'win'),
( 1, 'Southgate United U-12',    '2025-06-21', '10:00:00', 'home', 'Academy Stadium',        NULL, NULL, 'scheduled', 'pending');

-- Payments (18 rows)
INSERT INTO Payments (player_id, amount, due_date, paid_date, payment_type, status, notes) VALUES
( 1, 150.00, '2025-06-01', '2025-05-28', 'monthly_fee',  'paid',    'Paid early via bank transfer'),
( 2, 150.00, '2025-06-01', NULL,         'monthly_fee',  'overdue', 'Reminder sent 2025-06-05'),
( 3, 150.00, '2025-06-01', '2025-06-01', 'monthly_fee',  'paid',    NULL),
( 4, 175.00, '2025-06-01', '2025-05-30', 'monthly_fee',  'paid',    NULL),
( 5, 175.00, '2025-06-01', NULL,         'monthly_fee',  'overdue', 'Second reminder issued'),
( 6, 175.00, '2025-06-01', NULL,         'monthly_fee',  'pending', 'Injured — payment plan requested'),
( 7, 200.00, '2025-06-01', '2025-06-02', 'monthly_fee',  'paid',    NULL),
( 8, 200.00, '2025-06-01', NULL,         'monthly_fee',  'overdue', NULL),
( 9, 200.00, '2025-06-01', '2025-06-01', 'monthly_fee',  'paid',    NULL),
(10, 225.00, '2025-06-01', NULL,         'monthly_fee',  'overdue', 'Parent contacted by phone'),
(11, 225.00, '2025-06-01', '2025-05-29', 'monthly_fee',  'paid',    NULL),
(12, 225.00, '2025-06-01', NULL,         'monthly_fee',  'pending', NULL),
(13, 150.00, '2025-06-01', '2025-06-03', 'monthly_fee',  'paid',    NULL),
(14, 175.00, '2025-05-15', '2025-05-14', 'tournament',   'paid',    'Spring Cup entry fee'),
(15, 175.00, '2025-06-01', NULL,         'monthly_fee',  'overdue', NULL),
(16, 200.00, '2025-06-01', '2025-06-01', 'monthly_fee',  'paid',    NULL),
(17, 225.00, '2025-04-01', NULL,         'registration', 'overdue', 'Registration renewal overdue'),
(18, 120.00, '2025-06-01', NULL,         'equipment',    'pending', 'New training kit order');

-- =============================================================================
-- EXAMPLE QUERIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- QUERY 1: JOIN across 4 tables — player training attendance with team & coach
-- -----------------------------------------------------------------------------
SELECT
    p.first_name,
    p.last_name,
    t.team_name,
    CONCAT(c.first_name, ' ', c.last_name) AS coach_name,
    ts.session_date,
    ts.focus_area,
    a.status AS attendance_status
FROM Attendance a
    INNER JOIN Players p           ON a.player_id  = p.player_id
    INNER JOIN Training_Sessions ts ON a.session_id = ts.session_id
    INNER JOIN Teams t             ON ts.team_id   = t.team_id
    INNER JOIN Coaches c           ON ts.coach_id  = c.coach_id
WHERE ts.status = 'completed'
ORDER BY ts.session_date DESC, p.last_name;

-- -----------------------------------------------------------------------------
-- QUERY 2: JOIN across 3 tables — match results with team and head coach
-- -----------------------------------------------------------------------------
SELECT
    m.match_date,
    t.team_name,
    t.age_group,
    CONCAT(co.first_name, ' ', co.last_name) AS head_coach,
    m.opponent_name,
    m.venue_type,
    CONCAT(IFNULL(m.home_score, '-'), ' : ', IFNULL(m.away_score, '-')) AS scoreline,
    m.result
FROM Matches m
    INNER JOIN Teams t   ON m.team_id   = t.team_id
    INNER JOIN Coaches co ON t.coach_id = co.coach_id
WHERE m.status = 'completed'
ORDER BY m.match_date DESC;

-- -----------------------------------------------------------------------------
-- QUERY 3: Aggregation with GROUP BY and HAVING
-- Teams with more than 2 overdue or pending payments across their roster
-- -----------------------------------------------------------------------------
SELECT
    t.team_id,
    t.team_name,
    t.age_group,
    COUNT(pay.payment_id)                    AS unpaid_count,
    SUM(pay.amount)                          AS total_outstanding,
    ROUND(AVG(pay.amount), 2)                AS avg_fee
FROM Teams t
    INNER JOIN Players pl  ON pl.team_id   = t.team_id
    INNER JOIN Payments pay ON pay.player_id = pl.player_id
WHERE pay.status IN ('overdue', 'pending')
GROUP BY t.team_id, t.team_name, t.age_group
HAVING unpaid_count >= 2
ORDER BY total_outstanding DESC;

-- -----------------------------------------------------------------------------
-- QUERY 4: Nested subquery using IN
-- Players who attended every completed training session for their team
-- -----------------------------------------------------------------------------
SELECT
    p.player_id,
    p.first_name,
    p.last_name,
    t.team_name
FROM Players p
    INNER JOIN Teams t ON p.team_id = t.team_id
WHERE p.status = 'active'
  AND p.player_id IN (
      SELECT a.player_id
      FROM Attendance a
      WHERE a.status = 'present'
        AND a.session_id IN (
            SELECT ts.session_id
            FROM Training_Sessions ts
            WHERE ts.status = 'completed'
              AND ts.team_id = p.team_id
        )
      GROUP BY a.player_id
      HAVING COUNT(DISTINCT a.session_id) = (
          SELECT COUNT(*)
          FROM Training_Sessions ts2
          WHERE ts2.team_id = p.team_id
            AND ts2.status = 'completed'
      )
  );

-- -----------------------------------------------------------------------------
-- QUERY 5: Nested subquery using EXISTS
-- Coaches who have led at least one completed match-winning team this season
-- -----------------------------------------------------------------------------
SELECT
    c.coach_id,
    c.first_name,
    c.last_name,
    c.specialization
FROM Coaches c
WHERE c.status = 'active'
  AND EXISTS (
      SELECT 1
      FROM Teams t
      WHERE t.coach_id = c.coach_id
        AND EXISTS (
            SELECT 1
            FROM Matches m
            WHERE m.team_id = t.team_id
              AND m.status = 'completed'
              AND m.result = 'win'
              AND m.match_date >= '2025-01-01'
        )
  )
ORDER BY c.last_name, c.first_name;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- VIEW 1: Dashboard summary stats
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM Players WHERE status = 'active')          AS total_active_players,
    (SELECT COUNT(*) FROM Matches
        WHERE status = 'scheduled' AND match_date >= CURDATE())     AS upcoming_matches,
    (SELECT COUNT(*) FROM Payments
        WHERE status IN ('overdue', 'pending'))                     AS unpaid_fees_count,
    (SELECT IFNULL(SUM(amount), 0) FROM Payments
        WHERE status IN ('overdue', 'pending'))                     AS unpaid_fees_total,
    (SELECT COUNT(*) FROM Training_Sessions
        WHERE status = 'scheduled' AND session_date >= CURDATE())   AS upcoming_sessions,
    (SELECT COUNT(*) FROM Coaches WHERE status = 'active')            AS active_coaches;

-- -----------------------------------------------------------------------------
-- VIEW 2: Player payment overview with overdue flag
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_player_payment_status AS
SELECT
    p.player_id,
    CONCAT(p.first_name, ' ', p.last_name)  AS player_name,
    t.team_name,
    t.age_group,
    pay.payment_id,
    pay.payment_type,
    pay.amount,
    pay.due_date,
    pay.paid_date,
    pay.status,
    CASE
        WHEN pay.status = 'overdue' THEN 1
        WHEN pay.status = 'pending' AND pay.due_date < CURDATE() THEN 1
        ELSE 0
    END AS is_overdue_flag,
    DATEDIFF(CURDATE(), pay.due_date) AS days_past_due
FROM Payments pay
    INNER JOIN Players p ON pay.player_id = p.player_id
    INNER JOIN Teams t   ON p.team_id     = t.team_id;

-- =============================================================================
-- TRIGGER
-- =============================================================================

DELIMITER $$

-- Automatically set match result and status when scores are entered/updated
CREATE TRIGGER trg_matches_set_result
BEFORE UPDATE ON Matches
FOR EACH ROW
BEGIN
    IF NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
        SET NEW.status = 'completed';

        IF NEW.home_score > NEW.away_score THEN
            SET NEW.result = 'win';
        ELSEIF NEW.home_score < NEW.away_score THEN
            SET NEW.result = 'loss';
        ELSE
            SET NEW.result = 'draw';
        END IF;
    END IF;
END$$

DELIMITER ;

-- =============================================================================
-- VERIFICATION (optional — uncomment to run after import)
-- =============================================================================
-- SELECT * FROM vw_dashboard_stats;
-- SELECT * FROM vw_player_payment_status WHERE is_overdue_flag = 1;
-- SELECT table_name, table_rows FROM information_schema.tables
--   WHERE table_schema = 'football_academy' ORDER BY table_name;

-- =============================================================================
-- END OF SCRIPT
-- =============================================================================
