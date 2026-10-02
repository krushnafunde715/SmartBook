"""
SmartBook — REST API Blueprint
Provides JSON endpoints for Profile, Preferences, Catalog Search, Shelves, Wishlist, History, and Recommendations.
"""

from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_login import current_user
from models import db, User, Genre, Book, UserPreferences, UserBook, WishlistItem, ReadingHistory, utcnow
from recommendation_engine import get_recommendations_for_user, evaluate_book_recommendation
from stats_service import (
    get_user_reading_stats,
    normalize_status,
    record_reading_history_event,
    STATUS_COMPLETED,
    STATUS_CURRENTLY_READING,
    STATUS_WANT_TO_READ
)

api_bp = Blueprint('api', __name__, url_prefix='/api')


def get_current_or_demo_user():
    """Helper to return authenticated user with demo user fallback for testing/dev"""
    if current_user and current_user.is_authenticated:
        return current_user
    return User.query.filter_by(email='krushna.patel@example.com').first()


# =============================================================================
# USER & PROFILE APIS
# =============================================================================

@api_bp.route('/health', methods=['GET'])
def api_health():
    """Health-check endpoint for load balancers and container orchestrators"""
    try:
        # Verify database connection
        db.session.execute(db.text('SELECT 1'))
        db_status = 'connected'
    except Exception as e:
        db_status = f'disconnected: {str(e)}'

    return jsonify({
        'status': 'healthy' if db_status == 'connected' else 'degraded',
        'database': db_status,
        'version': '1.0.0',
        'timestamp': utcnow().isoformat() + 'Z'
    }), 200 if db_status == 'connected' else 503


@api_bp.route('/user/me', methods=['GET'])
def api_user_me():
    """Returns the authenticated user's profile dictionary"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'Unauthenticated'}), 401
    return jsonify({'success': True, 'user': target_user.to_dict()})


@api_bp.route('/user/stats', methods=['GET'])
def api_user_stats():
    """Returns authoritative unified user reading statistics"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    stats = get_user_reading_stats(target_user.id)
    return jsonify({'success': True, 'stats': stats})


@api_bp.route('/user/profile', methods=['POST', 'PUT'])
def api_user_profile():
    """Updates user personal information and notification preferences"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    data = request.get_json() or request.form

    try:
        if 'fullName' in data and str(data['fullName']).strip():
            target_user.full_name = str(data['fullName']).strip()
        if 'email' in data and str(data['email']).strip():
            new_email = str(data['email']).strip().lower()
            existing_email = User.query.filter(User.email == new_email, User.id != target_user.id).first()
            if existing_email:
                return jsonify({'success': False, 'message': 'Email address is already in use by another account.'}), 400
            target_user.email = new_email
        if 'phone' in data:
            target_user.phone = str(data['phone']).strip()
        if 'dob' in data and data['dob']:
            try:
                target_user.date_of_birth = datetime.strptime(data['dob'], '%Y-%m-%d').date()
            except ValueError:
                pass
        if 'language' in data and str(data['language']).strip():
            target_user.preferred_language = str(data['language']).strip()
            if target_user.preference:
                target_user.preference.preferred_language = target_user.preferred_language
        if 'avatarUrl' in data:
            target_user.profile_image = str(data['avatarUrl']).strip()
        if 'emailNotifications' in data:
            target_user.email_notifications = bool(data['emailNotifications'])
        if 'readingReminders' in data:
            target_user.reading_reminders = bool(data['readingReminders'])

        target_user.updated_at = utcnow()
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': target_user.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'An error occurred while updating profile.'}), 500


@api_bp.route('/user/preferences', methods=['GET', 'POST', 'PUT'])
def api_user_preferences():
    """Reads or updates reader genre and reading duration preferences"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if not target_user.preference:
        pref = UserPreferences(user_id=target_user.id)
        db.session.add(pref)
        db.session.commit()

    all_genres = Genre.query.order_by(Genre.name.asc()).all()

    if request.method == 'GET':
        return jsonify({
            'success': True,
            'preferences': target_user.preference.to_dict(),
            'allGenres': [g.to_dict() for g in all_genres]
        })

    data = request.get_json() or request.form
    pref = target_user.preference

    try:
        if 'preferredGenres' in data or 'genres' in data:
            genre_inputs = data.get('preferredGenres') or data.get('genres') or []
            if isinstance(genre_inputs, list):
                all_db_genres = Genre.query.all()
                matched = []
                for item in genre_inputs:
                    item_str = str(item).strip().lower()
                    for g in all_db_genres:
                        if g.name.lower() == item_str or g.slug.lower() == item_str or (item_str == 'sci-fi' and 'science' in g.name.lower()):
                            if g not in matched:
                                matched.append(g)
                pref.preferred_genres = matched

        if 'language' in data and data['language']:
            pref.preferred_language = str(data['language']).strip()
            target_user.preferred_language = pref.preferred_language

        if 'readingDuration' in data and data['readingDuration']:
            pref.reading_duration = str(data['readingDuration']).strip()

        if 'readingGoal' in data and data['readingGoal']:
            try:
                pref.reading_goal = max(1, int(data['readingGoal']))
            except (ValueError, TypeError):
                pass

        if 'interests' in data:
            pref.interests = str(data['interests']).strip()

        pref.updated_at = utcnow()
        target_user.updated_at = utcnow()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Reading preferences updated successfully!',
            'preferences': pref.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Failed to update reading preferences.'}), 500


@api_bp.route('/user/change-password', methods=['POST'])
@api_bp.route('/user/password', methods=['POST'])
def api_change_password():
    """Updates password with verification of current password"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    data = request.get_json() or request.form
    curr_pwd = data.get('currentPassword', '')
    new_pwd = data.get('newPassword', '')

    if not target_user.check_password(curr_pwd):
        return jsonify({'success': False, 'message': 'Current password is incorrect.'}), 400

    if len(new_pwd) < 8:
        return jsonify({'success': False, 'message': 'New password must be at least 8 characters long.'}), 400

    try:
        target_user.set_password(new_pwd)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Password updated securely!'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Error updating password.'}), 500


# =============================================================================
# CATALOG & BOOKS APIS
# =============================================================================

@api_bp.route('/books', methods=['GET'])
def api_books():
    """Book catalog search, genre filter, language filter, and sort"""
    query = request.args.get('q', '').strip().lower()
    genre_slug = request.args.get('genre', 'all').strip().lower()
    language = request.args.get('language', 'all').strip().lower()
    sort_by = request.args.get('sort', 'rating-desc')

    books_q = Book.query

    if language != 'all':
        books_q = books_q.filter(Book.language.ilike(language))

    books = books_q.all()

    if genre_slug != 'all':
        books = [b for b in books if any(g.slug == genre_slug or g.name.lower() == genre_slug for g in b.genres)]

    if query:
        books = [b for b in books if query in b.title.lower() or query in b.author.lower() or query in b.description.lower()]

    if sort_by == 'rating-desc':
        books.sort(key=lambda b: -b.rating)
    elif sort_by == 'title-asc':
        books.sort(key=lambda b: b.title.lower())
    elif sort_by == 'author-asc':
        books.sort(key=lambda b: b.author.lower())
    elif sort_by == 'year-desc':
        books.sort(key=lambda b: -b.publication_year)

    return jsonify({'success': True, 'books': [b.to_dict() for b in books], 'count': len(books)})


@api_bp.route('/books/<int:book_id>', methods=['GET'])
def api_book_details(book_id):
    """Retrieves single book entity"""
    book = db.session.get(Book, book_id)
    if not book:
        return jsonify({'success': False, 'message': 'Book not found'}), 404
    return jsonify({'success': True, 'book': book.to_dict()})


# =============================================================================
# LIBRARY & SHELVES APIS
# =============================================================================

@api_bp.route('/library', methods=['GET', 'POST'])
def api_library():
    """Lists user library books or adds a new book to library shelf"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if request.method == 'GET':
        user_books = UserBook.query.filter_by(user_id=target_user.id).all()
        stats = get_user_reading_stats(target_user.id)
        book_dicts = [ub.to_dict() for ub in user_books]
        return jsonify({
            'success': True,
            'stats': stats,
            'books': book_dicts,
            'library': book_dicts,
            'count': len(user_books)
        })

    data = request.get_json() or request.form
    book_id = data.get('bookId')
    book_title = data.get('title')
    status = normalize_status(data.get('status', STATUS_WANT_TO_READ))

    book = None
    if book_id:
        try:
            book = db.session.get(Book, int(book_id))
        except (ValueError, TypeError):
            pass
    if not book and book_title:
        book = Book.query.filter(Book.title.ilike(book_title.strip())).first()

    if not book:
        return jsonify({'success': False, 'message': 'Book not found'}), 404

    try:
        existing_ub = UserBook.query.filter_by(user_id=target_user.id, book_id=book.id).first()
        if existing_ub:
            existing_ub.status = status
            existing_ub.updated_at = utcnow()
            if status == STATUS_COMPLETED:
                if not existing_ub.completed_at:
                    existing_ub.completed_at = utcnow()
                existing_ub.current_page = book.page_count
                record_reading_history_event(
                    target_user.id,
                    book.id,
                    'completed',
                    f'Completed reading all {book.page_count} pages of "{book.title}".'
                )
            elif status == STATUS_CURRENTLY_READING:
                record_reading_history_event(
                    target_user.id,
                    book.id,
                    'started',
                    f'Started reading "{book.title}".'
                )
            db.session.commit()
            stats = get_user_reading_stats(target_user.id)
            return jsonify({
                'success': True,
                'message': f'"{book.title}" shelf updated to {status}',
                'book': existing_ub.to_dict(),
                'stats': stats
            })

        # Remove from wishlist when added to library
        WishlistItem.query.filter_by(user_id=target_user.id, book_id=book.id).delete()

        new_ub = UserBook(
            user_id=target_user.id,
            book_id=book.id,
            status=status,
            current_page=book.page_count if status == STATUS_COMPLETED else 0,
            added_at=utcnow(),
            completed_at=utcnow() if status == STATUS_COMPLETED else None
        )
        db.session.add(new_ub)

        if status == STATUS_COMPLETED:
            record_reading_history_event(target_user.id, book.id, 'completed', f'Completed reading "{book.title}".')
        elif status == STATUS_CURRENTLY_READING:
            record_reading_history_event(target_user.id, book.id, 'started', f'Started reading "{book.title}".')
        else:
            record_reading_history_event(target_user.id, book.id, 'added', f'Added "{book.title}" to Want to Read shelf.')

        db.session.commit()
        stats = get_user_reading_stats(target_user.id)

        return jsonify({
            'success': True,
            'message': f'"{book.title}" added to your library!',
            'book': new_ub.to_dict(),
            'stats': stats
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'An error occurred while adding book to library.'}), 500


@api_bp.route('/library/<int:ub_id>', methods=['PUT', 'DELETE'])
def api_library_item(ub_id):
    """Updates progress/shelf/rating or deletes a user library item with authorization check"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    ub = db.session.get(UserBook, ub_id)
    if not ub or ub.user_id != target_user.id:
        return jsonify({'success': False, 'message': 'Library item not found or unauthorized access'}), 404

    if request.method == 'DELETE':
        try:
            book_title = ub.book.title
            book_id = ub.book_id
            db.session.delete(ub)
            record_reading_history_event(target_user.id, book_id, 'removed', f'Removed "{book_title}" from library.')
            db.session.commit()
            stats = get_user_reading_stats(target_user.id)
            return jsonify({'success': True, 'message': f'"{book_title}" removed from library.', 'stats': stats})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Could not remove library item.'}), 500

    data = request.get_json() or request.form
    try:
        if 'currentPage' in data:
            new_page = min(ub.book.page_count, max(0, int(data['currentPage'])))
            ub.current_page = new_page
            if new_page >= ub.book.page_count and ub.status != STATUS_COMPLETED:
                ub.status = STATUS_COMPLETED
                ub.completed_at = utcnow()
                record_reading_history_event(
                    target_user.id,
                    ub.book_id,
                    'completed',
                    f'Completed reading all {ub.book.page_count} pages of "{ub.book.title}".'
                )
            else:
                record_reading_history_event(
                    target_user.id,
                    ub.book_id,
                    'updated_progress',
                    f'Updated progress to page {new_page} of {ub.book.page_count} in "{ub.book.title}".'
                )

        if 'status' in data:
            old_status = normalize_status(ub.status)
            new_status = normalize_status(data['status'])
            ub.status = new_status
            if new_status == STATUS_COMPLETED and not ub.completed_at:
                ub.completed_at = utcnow()
                ub.current_page = ub.book.page_count
                record_reading_history_event(
                    target_user.id,
                    ub.book_id,
                    'completed',
                    f'Completed reading "{ub.book.title}".'
                )
            elif new_status == STATUS_CURRENTLY_READING and old_status != STATUS_CURRENTLY_READING:
                record_reading_history_event(
                    target_user.id,
                    ub.book_id,
                    'started',
                    f'Started reading "{ub.book.title}".'
                )

        if 'rating' in data and data['rating'] is not None:
            ub.user_rating = float(data['rating'])
        if 'review' in data and data['review']:
            ub.review = str(data['review']).strip()
            record_reading_history_event(
                target_user.id,
                ub.book_id,
                'reviewed',
                f'Submitted a review for "{ub.book.title}".'
            )

        ub.updated_at = utcnow()
        db.session.commit()
        stats = get_user_reading_stats(target_user.id)
        return jsonify({
            'success': True,
            'message': 'Library item updated',
            'book': ub.to_dict(),
            'stats': stats
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'An error occurred while updating library item.'}), 500


# =============================================================================
# WISHLIST APIS
# =============================================================================

@api_bp.route('/wishlist', methods=['GET', 'POST'])
def api_wishlist():
    """Lists or adds books to authenticated user's wishlist"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if request.method == 'GET':
        items = WishlistItem.query.filter_by(user_id=target_user.id).order_by(WishlistItem.added_at.desc()).all()
        item_dicts = [w.to_dict() for w in items]
        return jsonify({'success': True, 'items': item_dicts, 'wishlist': item_dicts, 'count': len(items)})

    data = request.get_json() or request.form
    book_id = data.get('bookId')
    book_title = data.get('title')

    book = None
    if book_id:
        try:
            book = db.session.get(Book, int(book_id))
        except (ValueError, TypeError):
            pass
    if not book and book_title:
        book = Book.query.filter(Book.title.ilike(book_title.strip())).first()

    if not book:
        return jsonify({'success': False, 'message': 'Book not found'}), 404

    try:
        existing = WishlistItem.query.filter_by(user_id=target_user.id, book_id=book.id).first()
        if existing:
            return jsonify({'success': True, 'message': f'"{book.title}" is already in your wishlist.', 'item': existing.to_dict()})

        new_item = WishlistItem(user_id=target_user.id, book_id=book.id, added_at=utcnow())
        db.session.add(new_item)
        db.session.commit()
        return jsonify({'success': True, 'message': f'"{book.title}" added to wishlist!', 'item': new_item.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Failed to add item to wishlist.'}), 500


@api_bp.route('/wishlist/<int:item_id>', methods=['DELETE'])
def api_wishlist_delete(item_id):
    """Deletes an item from wishlist with authorization check"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    item = db.session.get(WishlistItem, item_id)
    if not item or item.user_id != target_user.id:
        return jsonify({'success': False, 'message': 'Wishlist item not found or unauthorized'}), 404

    try:
        title = item.book.title
        db.session.delete(item)
        db.session.commit()
        return jsonify({'success': True, 'message': f'"{title}" removed from wishlist.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Error removing item from wishlist.'}), 500


@api_bp.route('/wishlist/toggle', methods=['POST'])
def api_wishlist_toggle():
    """Toggles a book in/out of wishlist"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    data = request.get_json() or request.form
    book_id = data.get('bookId')
    book_title = data.get('title')

    book = None
    if book_id:
        try:
            book = db.session.get(Book, int(book_id))
        except (ValueError, TypeError):
            pass
    if not book and book_title:
        book = Book.query.filter(Book.title.ilike(book_title.strip())).first()

    if not book:
        return jsonify({'success': False, 'message': 'Book not found'}), 404

    try:
        existing = WishlistItem.query.filter_by(user_id=target_user.id, book_id=book.id).first()
        if existing:
            db.session.delete(existing)
            db.session.commit()
            return jsonify({'success': True, 'action': 'removed', 'message': f'Removed "{book.title}" from your Wishlist.'})
        else:
            new_item = WishlistItem(user_id=target_user.id, book_id=book.id, added_at=utcnow())
            db.session.add(new_item)
            db.session.commit()
            return jsonify({'success': True, 'action': 'added', 'message': f'Added "{book.title}" to your Wishlist!'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Could not toggle wishlist item.'}), 500


@api_bp.route('/wishlist/<int:item_id>/move-to-library', methods=['POST'])
def api_wishlist_move(item_id):
    """Moves book atomically from Wishlist to UserBook shelf in transaction"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    item = db.session.get(WishlistItem, item_id)
    if not item or item.user_id != target_user.id:
        return jsonify({'success': False, 'message': 'Wishlist item not found or unauthorized'}), 404

    try:
        book = item.book
        db.session.delete(item)

        existing_ub = UserBook.query.filter_by(user_id=target_user.id, book_id=book.id).first()
        if not existing_ub:
            new_ub = UserBook(user_id=target_user.id, book_id=book.id, status=STATUS_WANT_TO_READ, current_page=0)
            db.session.add(new_ub)
            record_reading_history_event(
                target_user.id,
                book.id,
                'added',
                f'Moved "{book.title}" from Wishlist to Want to Read shelf.'
            )

        db.session.commit()
        stats = get_user_reading_stats(target_user.id)
        return jsonify({
            'success': True,
            'message': f'Moved "{book.title}" to your Want to Read shelf!',
            'stats': stats
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Transaction failed while moving book to library.'}), 500


# =============================================================================
# READING HISTORY & RECOMMENDATIONS APIS
# =============================================================================

@api_bp.route('/history', methods=['GET'])
def api_history():
    """Lists completed books and chronological reading history events"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    user_books = UserBook.query.filter_by(user_id=target_user.id).all()
    completed = [ub for ub in user_books if normalize_status(ub.status) == STATUS_COMPLETED]
    completed.sort(key=lambda ub: ub.completed_at or ub.updated_at or datetime.min, reverse=True)
    events = ReadingHistory.query.filter_by(user_id=target_user.id).order_by(ReadingHistory.created_at.desc()).all()
    stats = get_user_reading_stats(target_user.id)

    event_dicts = [e.to_dict() for e in events]
    return jsonify({
        'success': True,
        'stats': stats,
        'events': event_dicts,
        'history': event_dicts,
        'completedBooks': [ub.to_dict() for ub in completed]
    })


@api_bp.route('/recommendations', methods=['GET'])
def api_recommendations():
    """Generates explainable recommendations based on user preferences"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    all_books = Book.query.all()
    recs = get_recommendations_for_user(target_user, all_books, limit=8)

    results = []
    for item in recs:
        b_dict = item['book'].to_dict()
        b_dict['matchScore'] = item['score']
        b_dict['score'] = item['score']
        b_dict['matchReason'] = item['reason']
        b_dict['explanation'] = item['reason']
        b_dict['breakdown'] = item['breakdown']
        b_dict['reasons'] = [
            f"{rule}: {details.get('explanation', '')}"
            for rule, details in item.get('breakdown', {}).items()
            if isinstance(details, dict) and details.get('score', 0) > 0
        ]
        results.append(b_dict)

    return jsonify({'success': True, 'recommendations': results})


@api_bp.route('/recommendations/explain/<int:book_id>', methods=['GET'])
def api_recommendations_explain(book_id):
    """Provides granular rule breakdown and explanation for a specific candidate book"""
    target_user = get_current_or_demo_user()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    book = db.session.get(Book, book_id)
    if not book:
        return jsonify({'success': False, 'message': 'Book not found'}), 404

    eval_res = evaluate_book_recommendation(book, target_user)
    return jsonify({
        'success': True,
        'book': book.to_dict(),
        'score': eval_res['score'],
        'breakdown': eval_res['breakdown'],
        'reason': eval_res['reason']
    })
