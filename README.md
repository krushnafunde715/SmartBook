# SmartBook — Rule-Based Book Recommendation & Reading Management System

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0%2B-green.svg)](https://flask.palletsprojects.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0%2B-red.svg)](https://www.sqlalchemy.org/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple.svg)](https://getbootstrap.com/)
[![License](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)

**SmartBook** is a full-stack web application combining a rule-based recommendation engine with reading shelf management, progress tracking, and an editorial digital bookstore aesthetic (Warm Ivory `#F7F5EF`, Deep Forest Green `#234E3E`, Charcoal `#252A27`, Muted Terracotta `#C87961`).

---

## Key Features

- 🎯 **Rule-Based Recommendation Engine**: Deterministic multi-factor scoring (genre affinity, reading duration, language preference, age group, and interest keywords) providing transparent, explainable compatibility percentages (0–100%).
- 📚 **Personal Library & Shelf Management**: Seamless transitions across *Want to Read*, *Currently Reading*, and *Completed* shelves with dynamic progress tracking and page calculations.
- 💖 **Interactive Wishlist**: Save books with one-click toggling and atomic transfer to your personal reading library.
- 📜 **Audit History & Milestones**: Chronological reading activity timeline tracking books started, progress updates, and completion dates.
- 📊 **Synchronized Reading Statistics**: Unified metrics across Dashboard, My Books, Reading History, and Profile powered by a centralized service.
- 🔔 **Accessible Notification System**: Global 5-second auto-dismissing flash and toast alerts with smooth animations, hover-to-pause countdowns, and accessible manual close buttons.
- 👤 **Comprehensive Profile Management**: Personal information updates, password management, notification toggles, dynamic save/cancel action bars, and synchronized user avatars.
- 🛡️ **Security & Production Hardened**: Scrypt password hashing, session cookie security flags (`Secure`, `HttpOnly`, `SameSite=Lax`), CSRF protection, MySQL connection pooling, and health-check endpoints.

---

## Technology Stack

- **Backend**: Python 3.10+, Flask, Flask-Login, Flask-SQLAlchemy, Werkzeug
- **Database**: MySQL 8.0+ (Production) / SQLite (Local Dev & Testing)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5.3, Bootstrap Icons
- **WSGI / Deployment**: Gunicorn (Linux), Waitress (Windows), Nginx reverse proxy

---

## Project Architecture

```
SmartBook/
├── app.py                     # Flask application factory & health endpoints
├── wsgi.py                    # Production WSGI entry point (Gunicorn/Waitress)
├── config.py                  # Environment configurations (Dev, Test, Prod)
├── models.py                  # SQLAlchemy ORM models (User, Book, UserBook, etc.)
├── stats_service.py           # Centralized statistics & reading metrics service
├── recommendation_engine.py   # Rule-based recommendation algorithm & explanations
├── seed_data.py               # Idempotent database seeder (catalog & demo data)
├── requirements.txt           # Python package dependencies
├── .env.example               # Safe environment variable configuration template
├── .gitignore                 # Version control exclusions
│
├── routes/                    # Flask Blueprint modular route handlers
│   ├── auth.py                # Authentication (Registration, Login, Logout)
│   ├── main.py                # Page view routes (Dashboard, Explore, Shelves, etc.)
│   └── api.py                 # RESTful JSON APIs (Profile, Library, Wishlist, Recs)
│
├── templates/                 # Jinja2 HTML templates
│   ├── base.html              # Base layout with alert components & top navigation
│   ├── components/            # Reusable partials (alerts, toast container, modals)
│   ├── auth/                  # Split-screen Login and Registration pages
│   └── main/                  # Dashboard, Explore, My Books, Wishlist, History, Profile
│
├── static/                    # Static assets
│   ├── css/                   # Modular stylesheets (variables, dashboard, alerts, etc.)
│   ├── js/                    # Client-side scripts (alerts, dashboard, shelves, profile)
│   └── images/                # Brand SVGs, icons, and illustrations
│
└── test_*.py                  # Automated test suites (Auth, Buttons, E2E QA, Stats)
```

---

## Installation & Setup

### 1. Prerequisites
- Python 3.10 or higher
- Git
- MySQL Server (optional; SQLite fallback is supported automatically)

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/smartbook.git
cd smartbook
```

### 3. Create a Virtual Environment
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables
Copy `.env.example` to create your `.env` file:
```bash
cp .env.example .env
```
Edit `.env` to configure your `SECRET_KEY`, `FLASK_ENV`, and database connection parameters.

---

## Database Initialization

SmartBook initializes tables and idempotent catalog seed data on startup.

To manually seed or reset the database:
```bash
python seed_data.py
```

---

## Running the Application

### Development Mode
```bash
python app.py
```
Access the application at `http://127.0.0.1:5000/`.

### Production Mode (WSGI)

**Using Gunicorn (Linux):**
```bash
gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app
```

**Using Waitress (Windows):**
```bash
waitress-serve --listen=127.0.0.1:5000 wsgi:app
```

---

## Running Automated Tests

Execute the complete automated regression and end-to-end QA test suite:
```bash
python -m unittest discover -s . -p "test_*.py"
```

All 27 test cases cover:
- Authentication, protected routes, and session termination
- Catalog search, filtering, and sorting
- Reading shelf transitions, progress calculation, and completion milestones
- Wishlist additions and atomic shelf transfers
- Profile updates, password changes, and notification toggles
- Recommendation scoring accuracy and explanation formatting
- Cross-page data consistency and security edge cases

---

## Application Pages & Routes

| Page | URL | Description |
| :--- | :--- | :--- |
| **Landing Page** | `/` | Editorial bookstore introduction and feature highlights |
| **Login** | `/auth/login` | Split-screen authentication with password visibility toggle |
| **Register** | `/auth/register` | Split-screen account creation with validation |
| **Dashboard** | `/dashboard` | Reading statistics, active book banner, and recommendations |
| **Explore Books** | `/explore` | Catalog search with genre/language filters and sorting |
| **My Books** | `/my-books` | Multi-shelf manager (*Want to Read*, *Currently Reading*, *Completed*) |
| **My Wishlist** | `/wishlist` | Saved books with direct transfer to reading library |
| **Reading History** | `/history` | Milestone timeline and completed book listings |
| **My Profile** | `/profile` | User profile, reading preferences, and security settings |

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
