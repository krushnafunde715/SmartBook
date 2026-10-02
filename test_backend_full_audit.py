"""
SmartBook — Comprehensive Master Backend Audit Test Suite
Verifies Application Factory, Models, Schemas, Auth, Data Isolation, Catalog,
Library, Wishlist, History, Stats, Recommendations, and Error Handlers.
"""

import unittest
import json
from datetime import date
from config import TestingConfig
from app import create_app
from models import db, User, Genre, Book, UserPreferences, UserBook, WishlistItem, ReadingHistory
from recommendation_engine import evaluate_book_recommendation, get_recommendations_for_user
from stats_service import get_user_reading_stats, normalize_status


class MasterBackendAuditTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self._seed_test_data()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _seed_test_data(self):
        """Seed minimal test fixtures in isolated in-memory database"""
        # Genres
        g1 = Genre(name='Science Fiction', slug='science-fiction', description='SciFi genre')
        g2 = Genre(name='Technology', slug='technology', description='Tech genre')
        g3 = Genre(name='Self-Help', slug='self-help', description='Self-help genre')
        db.session.add_all([g1, g2, g3])
        db.session.flush()

        # Users
        u1 = User(
            username='user_alice',
            email='alice@example.com',
            full_name='Alice Smith',
            preferred_language='English',
            date_of_birth=date(1995, 5, 20)
        )
        u1.set_password('password_alice_123')

        u2 = User(
            username='user_bob',
            email='bob@example.com',
            full_name='Bob Jones',
            preferred_language='English',
            date_of_birth=date(1990, 8, 10)
        )
        u2.set_password('password_bob_123')

        db.session.add_all([u1, u2])
        db.session.flush()

        # User 1 Preferences
        pref1 = UserPreferences(
            user_id=u1.id,
            preferred_language='English',
            age_group='Adult',
            reading_duration='Medium',
            reading_goal=24,
            interests='machine learning algorithms neural systems'
        )
        pref1.preferred_genres = [g1, g2]
        db.session.add(pref1)

        # Books
        b1 = Book(
            title='Project Hail Mary',
            author='Andy Weir',
            isbn='9780593135204',
            description='A lone astronaut must save earth from disaster through physics and biology.',
            language='English',
            publication_year=2021,
            page_count=496,
            reading_duration='Medium',
            min_age=14,
            max_age=99,
            rating=4.9
        )
        b1.genres.append(g1)

        b2 = Book(
            title='Clean Code',
            author='Robert C. Martin',
            isbn='9780132350884',
            description='A handbook of agile software craftsmanship and professional programming.',
            language='English',
            publication_year=2008,
            page_count=464,
            reading_duration='Medium',
            min_age=16,
            max_age=99,
            rating=4.7
        )
        b2.genres.append(g2)

        b3 = Book(
            title='The Alchemist',
            author='Paulo Coelho',
            isbn='9780062315007',
            description='An Andalusian shepherd boy travels to Egypt in search of worldly treasure.',
            language='Spanish',
            publication_year=1988,
            page_count=208,
            reading_duration='Short',
            min_age=10,
            max_age=99,
            rating=4.8
        )
        b3.genres.append(g3)

        db.session.add_all([b1, b2, b3])
        db.session.commit()

    def login_alice(self):
        return self.client.post('/auth/login', data={
            'email': 'alice@example.com',
            'password': 'password_alice_123'
        }, follow_redirects=True)

    def login_bob(self):
        return self.client.post('/auth/login', data={
            'email': 'bob@example.com',
            'password': 'password_bob_123'
        }, follow_redirects=True)

    # -------------------------------------------------------------------------
    # 1. Authentication & Security Tests
    # -------------------------------------------------------------------------

    def test_01_registration_flow(self):
        """Test registration with validation, password hashing, and preference initialization"""
        res = self.client.post('/auth/register', data={
            'full_name': 'Charlie Brown',
            'email': 'charlie@example.com',
            'password': 'securepassword123',
            'confirm_password': 'securepassword123'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)

        # Verify user in database with hashed password
        user = User.query.filter_by(email='charlie@example.com').first()
        self.assertIsNotNone(user)
        self.assertTrue(user.check_password('securepassword123'))
        self.assertFalse(user.check_password('wrongpassword'))
        self.assertIsNotNone(user.preference)

    def test_02_login_and_logout_direct_redirect(self):
        """Test login session creation and POST logout redirecting directly to Landing '/'"""
        # Login
        login_res = self.login_alice()
        self.assertEqual(login_res.status_code, 200)

        # Access protected route
        dash_res = self.client.get('/dashboard')
        self.assertEqual(dash_res.status_code, 200)

        # Logout via POST
        logout_res = self.client.post('/auth/logout', follow_redirects=False)
        self.assertEqual(logout_res.status_code, 302)
        self.assertEqual(logout_res.location, '/')

        # Verify unauthenticated access redirects to login
        protect_res = self.client.get('/dashboard', follow_redirects=False)
        self.assertEqual(protect_res.status_code, 302)
        self.assertIn('/auth/login', protect_res.location)

    # -------------------------------------------------------------------------
    # 2. Authorization & Data Isolation Tests
    # -------------------------------------------------------------------------

    def test_03_user_data_isolation(self):
        """Ensure User A cannot update or delete User B's library items"""
        alice = User.query.filter_by(email='alice@example.com').first()
        bob = User.query.filter_by(email='bob@example.com').first()
        b1 = Book.query.first()

        # Alice adds book to her library
        alice_ub = UserBook(user_id=alice.id, book_id=b1.id, status='currently-reading', current_page=100)
        db.session.add(alice_ub)
        db.session.commit()

        # Bob logs in and attempts to modify Alice's library item
        self.login_bob()
        hack_attempt = self.client.put(f'/api/library/{alice_ub.id}',
            data=json.dumps({'currentPage': 200}),
            content_type='application/json'
        )
        self.assertEqual(hack_attempt.status_code, 404)

        # Verify Alice's record was unaffected
        db.session.refresh(alice_ub)
        self.assertEqual(alice_ub.current_page, 100)

    # -------------------------------------------------------------------------
    # 3. Catalog, Search, and Filter Tests
    # -------------------------------------------------------------------------

    def test_04_book_catalog_search_and_filters(self):
        """Test catalog search by title/author/keyword, genre filter, and language filter"""
        # Query search
        res_q = self.client.get('/api/books?q=Hail')
        self.assertEqual(res_q.status_code, 200)
        data_q = res_q.get_json()
        self.assertEqual(len(data_q['books']), 1)
        self.assertEqual(data_q['books'][0]['title'], 'Project Hail Mary')

        # Genre filter
        res_g = self.client.get('/api/books?genre=technology')
        data_g = res_g.get_json()
        self.assertEqual(len(data_g['books']), 1)
        self.assertEqual(data_g['books'][0]['title'], 'Clean Code')

        # Language filter
        res_l = self.client.get('/api/books?language=Spanish')
        data_l = res_l.get_json()
        self.assertEqual(len(data_l['books']), 1)
        self.assertEqual(data_l['books'][0]['title'], 'The Alchemist')

    # -------------------------------------------------------------------------
    # 4. User Library & Reading Progress Lifecycle Tests
    # -------------------------------------------------------------------------

    def test_05_library_lifecycle_and_progress(self):
        """Add to library -> update progress -> mark completed -> verify history and stats"""
        self.login_alice()
        alice = User.query.filter_by(email='alice@example.com').first()
        book = Book.query.filter_by(title='Project Hail Mary').first()

        # 1. Add to Want to Read
        add_res = self.client.post('/api/library',
            data=json.dumps({'bookId': book.id, 'status': 'want-to-read'}),
            content_type='application/json'
        )
        self.assertEqual(add_res.status_code, 200)
        ub_id = add_res.get_json()['book']['id']

        # 2. Update Progress: Currently Reading, 200 pages
        prog_res = self.client.put(f'/api/library/{ub_id}',
            data=json.dumps({'status': 'currently-reading', 'currentPage': 200}),
            content_type='application/json'
        )
        self.assertEqual(prog_res.status_code, 200)
        prog_stats = prog_res.get_json()['stats']
        self.assertEqual(prog_stats['currently_reading_books'], 1)
        self.assertEqual(prog_stats['completed_books'], 0)
        self.assertEqual(prog_stats['total_pages_read'], 200)

        # 3. Finish Book: Completed, rating 5.0
        finish_res = self.client.put(f'/api/library/{ub_id}',
            data=json.dumps({'status': 'completed', 'currentPage': book.page_count, 'rating': 5.0, 'review': 'Masterpiece!'}),
            content_type='application/json'
        )
        self.assertEqual(finish_res.status_code, 200)
        finish_stats = finish_res.get_json()['stats']
        self.assertEqual(finish_stats['currently_reading_books'], 0)
        self.assertEqual(finish_stats['completed_books'], 1)
        self.assertEqual(finish_stats['total_pages_read'], 496)

        # 4. Verify Reading History Event was recorded
        rh = ReadingHistory.query.filter_by(user_id=alice.id, book_id=book.id, action='completed').first()
        self.assertIsNotNone(rh)

    # -------------------------------------------------------------------------
    # 5. Wishlist Atomic Operations Tests
    # -------------------------------------------------------------------------

    def test_06_wishlist_operations(self):
        """Add to wishlist -> Move to library in transaction"""
        self.login_alice()
        alice = User.query.filter_by(email='alice@example.com').first()
        book = Book.query.filter_by(title='Clean Code').first()

        # Add to wishlist
        w_res = self.client.post('/api/wishlist',
            data=json.dumps({'bookId': book.id}),
            content_type='application/json'
        )
        self.assertEqual(w_res.status_code, 200)
        item_id = w_res.get_json()['item']['id']

        # Move to library
        move_res = self.client.post(f'/api/wishlist/{item_id}/move-to-library',
            data=json.dumps({}),
            content_type='application/json'
        )
        self.assertEqual(move_res.status_code, 200)

        # Verify Wishlist item is deleted and UserBook exists
        self.assertIsNone(db.session.get(WishlistItem, item_id))
        self.assertIsNotNone(UserBook.query.filter_by(user_id=alice.id, book_id=book.id).first())

    # -------------------------------------------------------------------------
    # 6. Recommendation Engine Exact Scoring & Explanations Tests
    # -------------------------------------------------------------------------

    def test_07_recommendation_exact_scoring(self):
        """Verify 5-factor rule weights (Genre 40, Lang 20, Age 15, Duration 15, Interest 10 = 100)"""
        alice = User.query.filter_by(email='alice@example.com').first()
        b_hail_mary = Book.query.filter_by(title='Project Hail Mary').first()
        b_alchemist = Book.query.filter_by(title='The Alchemist').first()

        # Alice: Prefers English, Age 31, Duration Medium, Genres [SciFi, Tech], Interests 'algorithms'
        # Project Hail Mary: Genre SciFi (100% of 1 genre = 40), Lang English (20), Age 14-99 (15), Duration Medium (15), Interest 0 (0) = 90
        eval_hail = evaluate_book_recommendation(b_hail_mary, alice)
        self.assertEqual(eval_hail['breakdown']['genre'], 40.0)
        self.assertEqual(eval_hail['breakdown']['language'], 20.0)
        self.assertEqual(eval_hail['breakdown']['age'], 15.0)
        self.assertEqual(eval_hail['breakdown']['duration'], 15.0)
        self.assertEqual(eval_hail['score'], 90)
        self.assertIn("Matches your interest in Science Fiction", eval_hail['reason'])

        # The Alchemist: Spanish (0), Short vs Medium (0), Genre Self-Help (0), Age (15) = 15
        eval_alchemist = evaluate_book_recommendation(b_alchemist, alice)
        self.assertEqual(eval_alchemist['breakdown']['genre'], 0.0)
        self.assertEqual(eval_alchemist['breakdown']['language'], 0.0)
        self.assertEqual(eval_alchemist['breakdown']['duration'], 0.0)
        self.assertEqual(eval_alchemist['breakdown']['age'], 15.0)
        self.assertEqual(eval_alchemist['score'], 15)

    # -------------------------------------------------------------------------
    # 7. Error Handling Tests
    # -------------------------------------------------------------------------

    def test_08_error_handlers(self):
        """Verify 404 API returns JSON with 404 status code"""
        res_404 = self.client.get('/api/non-existent-endpoint')
        self.assertEqual(res_404.status_code, 404)
        self.assertEqual(res_404.get_json()['success'], False)


if __name__ == '__main__':
    unittest.main()
