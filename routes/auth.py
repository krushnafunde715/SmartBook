"""
SmartBook — Authentication Blueprint
Handles User Registration, Login, and Session Termination (Logout).
"""

from datetime import datetime, date
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from flask_login import login_user, logout_user, current_user
from models import db, User, Genre, UserPreferences, utcnow

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """User Login Handler"""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        remember = bool(request.form.get('remember'))

        if not email or not password:
            flash('Both email address and password are required.', 'warning')
            return render_template('auth/login.html')

        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            login_user(user, remember=remember)
            flash(f'Welcome back, {user.full_name}!', 'success')
            next_page = request.args.get('next')
            return redirect(next_page or url_for('main.dashboard'))
        else:
            flash('Invalid email address or password. Please verify your credentials and try again.', 'danger')

    return render_template('auth/login.html')


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """User Registration Handler"""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))

    if request.method == 'POST':
        full_name = request.form.get('full_name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        if not full_name or not email or not password:
            flash('All required fields must be completed.', 'warning')
            return render_template('auth/register.html')

        if password != confirm_password:
            flash('Passwords do not match. Please re-enter your password.', 'danger')
            return render_template('auth/register.html')

        if len(password) < 8:
            flash('Password must be at least 8 characters long for security.', 'warning')
            return render_template('auth/register.html')

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('An account with this email address already exists. Please log in.', 'warning')
            return redirect(url_for('auth.login'))

        # Generate unique username from email
        base_username = email.split('@')[0].replace('.', '_').replace('-', '_')
        username = base_username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}_{counter}"
            counter += 1

        try:
            new_user = User(
                username=username,
                email=email,
                full_name=full_name,
                preferred_language='English',
                date_of_birth=date(1998, 1, 1),
                role='user',
                created_at=utcnow()
            )
            new_user.set_password(password)
            db.session.add(new_user)
            db.session.flush()

            # Initialize Default UserPreferences
            pref = UserPreferences(
                user_id=new_user.id,
                preferred_language='English',
                age_group='Adult',
                reading_duration='Any',
                reading_goal=24,
                interests='Reading enthusiast exploring inspiring titles in SmartBook.'
            )
            default_genres = Genre.query.limit(4).all()
            pref.preferred_genres = default_genres
            db.session.add(pref)
            db.session.commit()

            login_user(new_user)
            flash('Your SmartBook account has been created successfully! Welcome to your digital library.', 'success')
            return redirect(url_for('main.dashboard'))

        except Exception as e:
            db.session.rollback()
            flash('An unexpected error occurred during account creation. Please try again.', 'danger')
            return render_template('auth/register.html')

    return render_template('auth/register.html')


@auth_bp.route('/logout', methods=['GET', 'POST'])
def logout():
    """User Logout — Immediate session termination with direct redirect to Landing Page"""
    logout_user()
    session.clear()
    flash('You have been logged out securely.', 'info')
    return redirect(url_for('main.index'))
