"""
SmartBook — Production WSGI Entry Point
For deployment using Gunicorn, uWSGI, Waitress, or Cloud Platforms.
"""

import os
from app import create_app

# Instantiate application in production mode by default
app = create_app(os.environ.get('FLASK_ENV', 'production'))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
