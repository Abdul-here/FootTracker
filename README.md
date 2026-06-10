# Football Sports Academy Management System

A full-stack web application for managing a football academy — players, coaches, teams, training sessions, matches, and payments. Built as a modern SaaS-style dashboard with a Flask JSON API backend and a responsive vanilla JavaScript frontend.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Description

This system provides a centralized platform for football academy administrators to:

- View real-time dashboard statistics (players, coaches, upcoming matches, unpaid fees)
- Manage player registrations and team assignments
- Organize coaching staff and squad structures
- Schedule training sessions and track fixtures/results
- Monitor payment status with overdue fee highlighting

The application follows REST conventions, uses parameterized SQL queries throughout, and delivers a consistent UI experience across desktop and mobile devices.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3, Flask 3 |
| **Database** | MySQL 8 (`football_academy`) |
| **DB Driver** | mysql-connector-python |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Icons** | Google Material Icons (CDN) |
| **Typography** | Inter (Google Fonts) |
| **Config** | python-dotenv |

### UI Color Palette

| Role | Hex |
|------|-----|
| Primary (Navy) | `#0A1628` |
| Accent (Gold) | `#F4A800` |
| Cards | `#FFFFFF` |
| Background | `#F5F7FA` |

---

## Folder Structure

```
DB_PBL/
├── app.py                          # Flask app — JSON API + page routes
├── run.py                          # Application entry point
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment variable template
├── LICENSE                         # MIT License
│
├── app/
│   ├── config.py                   # Configuration loader
│   ├── static/
│   │   ├── css/                    # base, layout, components, pages/
│   │   └── js/                     # main.js, validation.js, pages/
│   └── utils/
│       └── database.py             # DB helper re-exports
│
├── templates/
│   ├── base.html                   # Master layout
│   ├── partials/                   # navbar, sidebar
│   ├── dashboard/index.html
│   ├── players/list.html
│   ├── coaches/list.html
│   ├── teams/list.html
│   ├── training/schedule.html
│   ├── matches/list.html
│   └── payments/list.html
│
└── database/
    └── database.sql                # Full schema, sample data, views, trigger
```

---

## Database Tables (7)

| Table | Description |
|-------|-------------|
| `Coaches` | Coaching staff records |
| `Teams` | Squads linked to coaches |
| `Players` | Player profiles and team assignments |
| `Training_Sessions` | Scheduled training events |
| `Attendance` | Session attendance tracking |
| `Matches` | Fixtures and results |
| `Payments` | Fee tracking and overdue status |

---

## Setup Instructions

### Prerequisites

- Python 3.10 or higher
- MySQL Server 8.0 or higher
- Git

### 1. Clone the repository

```bash
git clone https://github.com/your-username/football-academy.git
cd football-academy
```

### 2. Create a virtual environment

**Windows**

```bash
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux**

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
copy .env.example .env        # Windows
cp .env.example .env          # macOS / Linux
```

Edit `.env` with your MySQL credentials:

```env
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=your-random-secret-key

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=football_academy
```

### 5. Set up MySQL database

Log in to MySQL and run the complete database script:

```bash
mysql -u root -p < database/database.sql
```

Or from the MySQL shell:

```sql
SOURCE /path/to/DB_PBL/database/database.sql;
```

This creates the `football_academy` database with all 7 tables, sample data, views, and triggers.

### 6. Run the Flask application

```bash
python app.py
```

Or:

```bash
python run.py
```

Open your browser at: **http://localhost:5000**

### 7. Verify the API (optional)

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/dashboard
```

---

## Pages & Navigation

All 7 pages are linked consistently in the sidebar on every screen:

| Page | URL | Sidebar Label |
|------|-----|---------------|
| Dashboard | `/` | Dashboard |
| Players | `/players` | Players |
| Coaches | `/coaches` | Coaches |
| Teams | `/teams` | Teams |
| Training Sessions | `/training-sessions` | Training |
| Matches | `/matches` | Matches |
| Payments | `/payments` | Payments |

---

## API Endpoints

Frontend pages connect to the Flask JSON API via `fetch()`. Endpoint mapping:

| Page | API Endpoints Used |
|------|-------------------|
| **Dashboard** | `GET /api/dashboard`, `GET /api/health` |
| **Players** | `GET/POST /api/players`, `PUT/DELETE /api/players/:id`, `GET /api/teams` |
| **Coaches** | `GET/POST /api/coaches`, `PUT/DELETE /api/coaches/:id` |
| **Teams** | `GET/POST /api/teams`, `PUT/DELETE /api/teams/:id`, `GET /api/coaches` |
| **Training** | `GET/POST /api/training-sessions`, `PUT/DELETE /api/training-sessions/:id`, `GET /api/teams`, `GET /api/coaches` |
| **Matches** | `GET/POST /api/matches`, `PUT/DELETE /api/matches/:id`, `GET /api/teams` |
| **Payments** | `GET/POST /api/payments`, `PUT/DELETE /api/payments/:id`, `GET /api/players` |

All API responses follow this JSON structure:

```json
{
  "success": true,
  "message": "success",
  "data": { }
}
```

---

## Screenshots

> Add screenshots here after running the application locally.

| Dashboard | Players |
|-----------|---------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Players](docs/screenshots/players.png) |

| Matches | Payments |
|-----------|----------|
| ![Matches](docs/screenshots/matches.png) | ![Payments](docs/screenshots/payments.png) |

*Place screenshot files in `docs/screenshots/` and update paths above.*

---

## Features

- RESTful JSON API with full CRUD on all 7 tables
- Parameterized SQL queries (SQL injection safe)
- Responsive SaaS dashboard UI (CSS Grid & Flexbox)
- Custom toast notifications (success / error / warning)
- Client-side form validation before submission
- Modal-based create/edit forms
- Overdue payment highlighting
- MySQL views, triggers, and advanced query examples in `database.sql`

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Football Sports Academy Management System

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## Author

Developed as a Database & Web Development project — NUTECH.
