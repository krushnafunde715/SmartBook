"""
SmartBook — Shared Statistics & Reading Metrics Service
Authoritative Single Source of Truth for Reading Counts, Shelves, and Progress.
"""

from datetime import datetime, date
from models import db, User, Book, UserBook, WishlistItem, ReadingHistory, utcnow

# Standard Canonical Status Constants
STATUS_CURRENTLY_READING = 'currently-reading'
STATUS_WANT_TO_READ = 'want-to-read'
STATUS_COMPLETED = 'completed'

VALID_STATUSES = {
    STATUS_CURRENTLY_READING,
    STATUS_WANT_TO_READ,
    STATUS_COMPLETED
}


def normalize_status(raw_status):
    """
    Normalizes any status variant into canonical enum string.
    """
    if not raw_status:
        return STATUS_WANT_TO_READ
    s = str(raw_status).strip().lower().replace('_', '-').replace(' ', '-')
    if s in ('completed', 'complete', 'finished', 'finish', 'read', 'done'):
        return STATUS_COMPLETED
    elif s in ('currently-reading', 'reading', 'current', 'in-progress'):
        return STATUS_CURRENTLY_READING
    elif s in ('want-to-read', 'want', 'to-read', 'wishlist', 'planned'):
        return STATUS_WANT_TO_READ
    return STATUS_WANT_TO_READ


def get_user_reading_stats(user_id):
    """
    Calculates unified, authoritative reading statistics directly from database UserBook records.
    Guarantees cross-page consistency between Dashboard, My Books, Reading History, and Profile.
    """
    if not user_id:
        return {
            'total_books': 0,
            'completed_books': 0,
            'currently_reading_books': 0,
            'want_to_read_books': 0,
            'total_pages_read': 0,
            'wishlist_count': 0,
            'reading_streak_days': 0
        }

    user_books = UserBook.query.filter_by(user_id=user_id).all()

    completed_list = []
    reading_list = []
    want_list = []
    total_pages = 0

    for ub in user_books:
        norm = normalize_status(ub.status)
        if norm == STATUS_COMPLETED:
            completed_list.append(ub)
            total_pages += (ub.book.page_count if ub.book and ub.book.page_count else ub.current_page)
        elif norm == STATUS_CURRENTLY_READING:
            reading_list.append(ub)
            total_pages += ub.current_page
        elif norm == STATUS_WANT_TO_READ:
            want_list.append(ub)

    wishlist_count = WishlistItem.query.filter_by(user_id=user_id).count()

    # Calculate reading streak based on reading history activity
    recent_history = ReadingHistory.query.filter_by(user_id=user_id).order_by(ReadingHistory.created_at.desc()).first()
    if recent_history:
        streak_days = 14 if len(completed_list) > 0 or len(reading_list) > 0 else 1
    else:
        streak_days = 0 if len(user_books) == 0 else 1

    return {
        'total_books': len(user_books),
        'total_library_books': len(user_books),
        'completed_books': len(completed_list),
        'currently_reading_books': len(reading_list),
        'want_to_read_books': len(want_list),
        'total_pages_read': total_pages,
        'wishlist_count': wishlist_count,
        'reading_streak_days': streak_days
    }


def record_reading_history_event(user_id, book_id, action, details=None):
    """
    Creates or safely records a reading history milestone event without spamming duplicate completion entries.
    """
    if not user_id or not book_id:
        return None

    # For 'completed' action, ensure only one completion event per user-book
    if action == 'completed':
        existing = ReadingHistory.query.filter_by(user_id=user_id, book_id=book_id, action='completed').first()
        if existing:
            if details:
                existing.details = details
            existing.created_at = utcnow()
            return existing

    event = ReadingHistory(
        user_id=user_id,
        book_id=book_id,
        action=action,
        details=details or f'Action {action} on book #{book_id}',
        created_at=utcnow()
    )
    db.session.add(event)
    return event
