# SmartBook — Production Deployment & Operations Guide

This guide details the deployment of **SmartBook** to production hosting environments (Linux VPS, AWS EC2, DigitalOcean Droplets, Docker containers, or Windows Server).

---

## 1. Prerequisites

- **Operating System**: Ubuntu 22.04 LTS / Debian 12 / RHEL 9 (or Windows Server 2022)
- **Python**: Version 3.10, 3.11, 3.12, 3.13, or 3.14
- **Database Engine**: MySQL 8.0+ (or MariaDB 10.6+). SQLite is also supported for low-traffic or staging instances.
- **Web Server / Reverse Proxy**: Nginx 1.18+ (or Apache / Caddy)
- **WSGI Application Server**: Gunicorn 21+ (Linux) or Waitress (Windows)
- **SSL Certificate**: Let's Encrypt / Certbot

---

## 2. Server Preparation & Environment Setup

### 2.1 Install System Dependencies (Ubuntu / Debian)
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv mysql-server nginx certbot python3-certbot-nginx git
```

### 2.2 Clone the Repository & Create Virtual Environment
```bash
cd /var/www
sudo git clone https://github.com/your-org/SmartBook.git smartbook
cd smartbook
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 3. Production Database Configuration (MySQL)

### 3.1 Create Database & User
Log in to MySQL as root:
```bash
sudo mysql -u root -p
```

Execute the database provisioning script:
```sql
CREATE DATABASE smartbook_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'smartbook_user'@'localhost' IDENTIFIED BY 'StrongAndSecurePassword2026!';

GRANT ALL PRIVILEGES ON smartbook_db.* TO 'smartbook_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 4. Environment Variables Configuration

Create the production `.env` file from the provided `.env.example`:
```bash
cp .env.example .env
chmod 600 .env
nano .env
```

### Production `.env` Values:
```ini
# Production Environment
FLASK_ENV=production
FLASK_DEBUG=0

# Cryptographically Secure 32+ character Secret Key
SECRET_KEY=c3f8e91024b89d47a51829e924a73e481b9e38d62b51680193cf9a4087e12e8b

# Production Port
PORT=5000

# MySQL Database Credentials
MYSQL_USER=smartbook_user
MYSQL_PASSWORD=StrongAndSecurePassword2026!
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=smartbook_db

# Connection Pool Settings
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_RECYCLE=280

# Security Settings
SESSION_COOKIE_SECURE=true
SEED_DEMO_DATA=false
```

---

## 5. Database Initialization & Catalog Seeding

Run the database seeder to create all relational tables, indexes, constraints, 10 core genres, 5 recommendation rules, and the 10 canonical library books:

```bash
source venv/bin/activate
python -c "from app import create_app, db; from seed_data import seed_system_catalog; app = create_app('production'); with app.app_context(): db.create_all(); seed_system_catalog(); print('Database schema and catalog initialized successfully.')"
```

---

## 6. WSGI Server Configuration (Gunicorn & Systemd)

### 6.1 Create Systemd Service File
```bash
sudo nano /etc/systemd/system/smartbook.service
```

Paste the following service definition:
```ini
[Unit]
Description=SmartBook Production Flask Application
After=network.target mysql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/smartbook
Environment="PATH=/var/www/smartbook/venv/bin"
EnvironmentFile=/var/www/smartbook/.env
ExecStart=/var/www/smartbook/venv/bin/gunicorn --workers 4 --bind 127.0.0.1:5000 --access-logfile /var/log/smartbook/access.log --error-logfile /var/log/smartbook/error.log wsgi:app

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 6.2 Set Permissions & Start Service
```bash
sudo mkdir -p /var/log/smartbook
sudo chown -R www-data:www-data /var/log/smartbook /var/www/smartbook
sudo systemctl daemon-reload
sudo systemctl start smartbook
sudo systemctl enable smartbook
sudo systemctl status smartbook
```

---

## 7. Nginx Reverse Proxy & SSL Configuration

### 7.1 Nginx Server Block
Create configuration file:
```bash
sudo nano /etc/nginx/sites-available/smartbook
```

Paste the server configuration:
```nginx
server {
    listen 80;
    server_name smartbook.yourdomain.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name smartbook.yourdomain.com;

    # SSL Certificates (Managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/smartbook.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smartbook.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Max upload size
    client_max_body_size 16M;

    # Static Assets Direct Serving with Long-term Caching
    location /static/ {
        alias /var/www/smartbook/static/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Proxy all dynamic requests to Gunicorn
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        proxy_read_timeout 90s;
    }

    # Health Check Endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
}
```

### 7.2 Enable Site & Obtain SSL Certificate
```bash
sudo ln -s /etc/nginx/sites-available/smartbook /etc/nginx/sites-enabled/
sudo nginx -t
sudo certbot --nginx -d smartbook.yourdomain.com
sudo systemctl reload nginx
```

---

## 8. Health Check & Monitoring

Verify the application is running and the database connection is live:

```bash
curl -i https://smartbook.yourdomain.com/health
```

Expected output:
```json
HTTP/2 200
content-type: application/json

{
  "status": "healthy",
  "database": "connected",
  "version": "1.0.0"
}
```

---

## 9. Security & Production Checklist

- [x] **No Hardcoded Secrets**: `SECRET_KEY` and MySQL credentials stored only in `.env`.
- [x] **Debug Disabled**: `FLASK_DEBUG=0` and `DEBUG=False` in Production config.
- [x] **Secure Session Cookies**: `SESSION_COOKIE_SECURE=true`, `HTTPONLY=True`, `SAMESITE='Lax'`.
- [x] **Password Protection**: Passwords securely hashed using PBKDF2/scrypt before persistence.
- [x] **Relational Constraints**: Unique constraints on `(user_id, book_id)` prevent duplicate shelf items.
- [x] **Data Isolation**: All user actions verify ownership (`item.user_id == current_user.id`).
- [x] **Atomic Transactions**: Multi-table operations wrapped in database transactions with rollback on failure.
- [x] **Production WSGI Server**: Gunicorn with process worker management.
- [x] **Static Asset Caching**: Nginx serves `/static/` with client-side caching.
- [x] **Health Check Endpoint**: `/health` and `/api/health` available for automated monitoring.

---

## 10. Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **502 Bad Gateway** | Gunicorn service is not running | Run `sudo systemctl status smartbook` and inspect `/var/log/smartbook/error.log`. |
| **Database Connection Error** | Invalid MySQL credentials or port | Verify credentials in `.env` and check MySQL service status (`sudo systemctl status mysql`). |
| **Session Lost on Browser Close** | Expired cookie or missing `SECRET_KEY` | Ensure `SECRET_KEY` is stable in `.env` and not generated dynamically on each worker boot. |
| **Static files returning 404** | Incorrect Nginx `alias` path | Verify `location /static/` points to the absolute path `/var/www/smartbook/static/`. |
| **Changes not reflecting** | Gunicorn workers caching bytecode | Run `sudo systemctl restart smartbook`. |
