"""
SmartBook — Application Factory & Core Server
Integrated Flask Web Application providing Single Source of Truth for Authentication,
Catalog, Shelves, Wishlist, Reading History, and Deterministic Recommendations.
"""

import os
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_login import LoginManager
from config import config_by_name, DevelopmentConfig
from models import db, User
from routes import auth_bp, main_bp, api_bp
from seed_data import seed_database


def create_app(config_name=None):
    """
    Application Factory Pattern for SmartBook.
    Initializes database ORM, Flask-Login, Blueprints, and Centralized Error Handlers.
    """
    app = Flask(__name__)

    # Load configuration
    if config_name is None:
        env = os.environ.get('FLASK_ENV', 'development').lower()
        config_class = config_by_name.get(env, DevelopmentConfig)
    elif isinstance(config_name, str):
        config_class = config_by_name.get(config_name.lower(), DevelopmentConfig)
    else:
        config_class = config_name

    app.config.from_object(config_class)

    # Initialize Extensions
    db.init_app(app)

    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access your digital library.'
    login_manager.login_message_category = 'info'

    @login_manager.user_loader
    def load_user(user_id):
        try:
            return db.session.get(User, int(user_id))
        except (ValueError, TypeError):
            return None

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp)

    @app.route('/health', methods=['GET'])
    def health_check():
        try:
            db.session.execute(db.text('SELECT 1'))
            db_status = 'connected'
        except Exception as e:
            db_status = f'disconnected: {str(e)}'

        return jsonify({
            'status': 'healthy' if db_status == 'connected' else 'degraded',
            'database': db_status,
            'version': '1.0.0'
        }), 200 if db_status == 'connected' else 503

    # Centralized Error Handlers
    @app.errorhandler(400)
    def bad_request_error(error):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Bad Request: Invalid or malformed request payload.'}), 400
        flash('Invalid request. Please try again.', 'warning')
        return redirect(request.referrer or url_for('main.index'))

    @app.errorhandler(403)
    def forbidden_error(error):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Forbidden: You do not have permission to access this resource.'}), 403
        flash('Access forbidden. You do not have sufficient permissions.', 'danger')
        return redirect(url_for('main.dashboard'))

    @app.errorhandler(404)
    def not_found_error(error):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Resource not found.'}), 404
        flash('The requested page could not be found.', 'warning')
        return redirect(url_for('main.index'))

    @app.errorhandler(500)
    def internal_server_error(error):
        db.session.rollback()
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'An unexpected server error occurred.'}), 500
        flash('A server error occurred. Our team has been notified.', 'danger')
        return redirect(url_for('main.index'))

    # Initialize Database Schema & Seed Data (if running live application)
    if not app.config.get('TESTING'):
        with app.app_context():
            try:
                db.create_all()
                seed_database(app)
            except Exception as e:
                print(f"[SmartBook Database Init Warning]: {e}")

    return app


# Default Application Instance for WSGI servers and dev runners
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=app.config.get('DEBUG', True))
