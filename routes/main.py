"""
SmartBook — Main UI Pages Blueprint
Renders Landing, Dashboard, Explore, My Books, Wishlist, Reading History, and Profile views.
"""

from datetime import datetime
import json
from flask import Blueprint, render_template, redirect, url_for
from flask_login import login_required, current_user
from sqlalchemy.orm import selectinload
from models import db, Genre, Book, UserBook, WishlistItem, ReadingHistory
from recommendation_engine import get_recommendations_for_user
from stats_service import (
    get_user_reading_stats,
    normalize_status,
    STATUS_COMPLETED,
    STATUS_CURRENTLY_READING,
    STATUS_WANT_TO_READ
)

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    """Public Landing Page"""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('main/index.html')


@main_bp.route('/dashboard')
@login_required
def dashboard():
    """Authenticated User Dashboard View"""
    all_books = Book.query.options(selectinload(Book.genres)).all()
    recommendations = get_recommendations_for_user(current_user, all_books, limit=6)

    user_books = (
        UserBook.query
        .options(selectinload(UserBook.book).selectinload(Book.genres))
        .filter_by(user_id=current_user.id)
        .all()
    )
    stats = get_user_reading_stats(current_user.id, user_books=user_books)
    currently_reading = [ub for ub in user_books if normalize_status(ub.status) == STATUS_CURRENTLY_READING]
    want_to_read = [ub for ub in user_books if normalize_status(ub.status) == STATUS_WANT_TO_READ]
    completed = [ub for ub in user_books if normalize_status(ub.status) == STATUS_COMPLETED]

    wishlist_items = (
        WishlistItem.query
        .options(selectinload(WishlistItem.book).selectinload(Book.genres))
        .filter_by(user_id=current_user.id)
        .all()
    )
    recent_history = (
        ReadingHistory.query
        .options(selectinload(ReadingHistory.book))
        .filter_by(user_id=current_user.id)
        .order_by(ReadingHistory.created_at.desc())
        .limit(5)
        .all()
    )

    return render_template(
        'main/dashboard.html',
        stats=stats,
        recommendations=recommendations,
        currently_reading=currently_reading,
        want_to_read=want_to_read,
        completed=completed,
        total_pages_read=stats['total_pages_read'],
        wishlist_items=wishlist_items,
        recent_history=recent_history
    )


@main_bp.route('/explore')
@login_required
def explore():
    """Explore Catalog View"""
    books = Book.query.options(selectinload(Book.genres)).order_by(Book.rating.desc()).all()
    genres = Genre.query.all()

    user_book_ids = {ub.book_id for ub in UserBook.query.filter_by(user_id=current_user.id).all()}
    user_wishlist_ids = {wl.book_id for wl in WishlistItem.query.filter_by(user_id=current_user.id).all()}

    return render_template(
        'main/explore.html',
        books=books,
        genres=genres,
        user_book_ids=user_book_ids,
        user_wishlist_ids=user_wishlist_ids
    )


@main_bp.route('/my-books')
@login_required
def my_books():
    """My Books Shelves View"""
    user_books = (
        UserBook.query
        .options(selectinload(UserBook.book).selectinload(Book.genres))
        .filter_by(user_id=current_user.id)
        .all()
    )
    stats = get_user_reading_stats(current_user.id, user_books=user_books)
    currently_reading = [ub for ub in user_books if normalize_status(ub.status) == STATUS_CURRENTLY_READING]
    want_to_read = [ub for ub in user_books if normalize_status(ub.status) == STATUS_WANT_TO_READ]
    completed = [ub for ub in user_books if normalize_status(ub.status) == STATUS_COMPLETED]

    initial_books_json = json.dumps([ub.to_dict() for ub in user_books])

    return render_template(
        'main/my_books.html',
        stats=stats,
        currently_reading=currently_reading,
        want_to_read=want_to_read,
        completed=completed,
        total_count=stats['total_books'],
        initial_books_json=initial_books_json
    )


@main_bp.route('/wishlist')
@login_required
def wishlist():
    """My Wishlist View"""
    wishlist_items = (
        WishlistItem.query
        .options(selectinload(WishlistItem.book).selectinload(Book.genres))
        .filter_by(user_id=current_user.id)
        .order_by(WishlistItem.added_at.desc())
        .all()
    )
    return render_template('main/wishlist.html', wishlist_items=wishlist_items)


@main_bp.route('/history')
@login_required
def history():
    """Reading History View"""
    user_books = (
        UserBook.query
        .options(selectinload(UserBook.book).selectinload(Book.genres))
        .filter_by(user_id=current_user.id)
        .all()
    )
    stats = get_user_reading_stats(current_user.id, user_books=user_books)
    completed_books = [ub for ub in user_books if normalize_status(ub.status) == STATUS_COMPLETED]
    completed_books.sort(key=lambda ub: ub.completed_at or ub.updated_at or datetime.min, reverse=True)
    history_events = (
        ReadingHistory.query
        .options(selectinload(ReadingHistory.book))
        .filter_by(user_id=current_user.id)
        .order_by(ReadingHistory.created_at.desc())
        .all()
    )

    return render_template(
        'main/history.html',
        stats=stats,
        completed_books=completed_books,
        history_events=history_events,
        total_pages=stats['total_pages_read'],
        active_count=stats['currently_reading_books']
    )


@main_bp.route('/profile')
@login_required
def profile():
    """User Profile View"""
    stats = get_user_reading_stats(current_user.id)
    return render_template('main/profile.html', user=current_user, stats=stats)
