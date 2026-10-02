"""
SmartBook — Comprehensive End-to-End Quality Assurance & Acceptance Test Suite
Tests entire full-stack lifecycle: Authentication, Discovery, Reading Shelves,
Statistics Consistency, Profile & Avatar Management, Recommendation Engine, and Edge Cases.
"""

import unittest
from datetime import date
from app import create_app
from config import TestingConfig
from models import db, User, Book, Genre, UserBook, WishlistItem, ReadingHistory, UserPreferences
from seed_data import seed_system_catalog
from stats_service import get_user_reading_stats, STATUS_WANT_TO_READ, STATUS_CURRENTLY_READING, STATUS_COMPLETED


class SmartBookE2EQATestCase(unittest.TestCase):
    """Full End-to-End QA and Acceptance Test Suite"""

    @classmethod
    def setUpClass(cls):
        cls.app = create_app(TestingConfig)
        cls.client = cls.app.test_client()

    def setUp(self):
        with self.app.app_context():
            db.create_all()
            seed_system_catalog()

            # Create Dedicated QA Test User
            self.test_user = User(
                username='qa_reader',
                email='qa.reader@example.com',
                full_name='QA Test Reader',
                phone='+1 (555) 019-2834',
                date_of_birth=date(1995, 6, 15),
                preferred_language='English',
                role='user',
                email_notifications=True,
                reading_reminders=True
            )
            self.test_user.set_password('Password123!')
            db.session.add(self.test_user)
            db.session.flush()

            # Create User Preferences
            pref = UserPreferences(
                user_id=self.test_user.id,
                preferred_language='English',
                age_group='Adult',
                reading_duration='30-60 min',
                reading_goal=12,
                interests='Personal growth, science, history, and classic literature.'
            )
            fiction = Genre.query.filter_by(slug='fiction').first()
            science = Genre.query.filter_by(slug='science').first()
            if fiction:
                pref.preferred_genres.append(fiction)
            if science:
                pref.preferred_genres.append(science)
            db.session.add(pref)
            db.session.commit()
            self.test_user_id = self.test_user.id

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    # -------------------------------------------------------------------------
    # 1. AUTHENTICATION & ACCESS CONTROL
    # -------------------------------------------------------------------------
    def test_01_user_registration_and_login_flow(self):
        """Test user registration, duplicate checks, login, and logout flow"""
        # Register new account
        res = self.client.post('/auth/register', data={
            'full_name': 'New Bookworm',
            'email': 'new.bookworm@example.com',
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)

        with self.app.app_context():
            created = User.query.filter_by(email='new.bookworm@example.com').first()
            self.assertIsNotNone(created)
            self.assertIsNotNone(created.preference)

        # Log out to test unauthenticated registration/login operations
        self.client.post('/auth/logout')

        # Duplicate registration failure
        res_dup = self.client.post('/auth/register', data={
            'full_name': 'Duplicate User',
            'email': 'new.bookworm@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        }, follow_redirects=True)
        self.assertIn(b'already exists', res_dup.data)

        # Invalid login
        res_bad_login = self.client.post('/auth/login', data={
            'email': 'new.bookworm@example.com',
            'password': 'WrongPassword!'
        }, follow_redirects=True)
        self.assertIn(b'Invalid email address or password', res_bad_login.data)

        # Successful login
        res_good_login = self.client.post('/auth/login', data={
            'email': 'new.bookworm@example.com',
            'password': 'SecurePassword123!'
        }, follow_redirects=True)
        self.assertEqual(res_good_login.status_code, 200)
        self.assertIn(b'Dashboard', res_good_login.data)

        # One-click Logout redirects to Landing Page ('/')
        res_logout = self.client.post('/auth/logout', follow_redirects=False)
        self.assertEqual(res_logout.status_code, 302)
        self.assertEqual(res_logout.headers['Location'], '/')

    def test_02_protected_route_access(self):
        """Verify unauthenticated users cannot access dashboard/shelves/profile directly"""
        protected_routes = ['/dashboard', '/profile', '/my-books', '/wishlist', '/history']
        for route in protected_routes:
            res = self.client.get(route, follow_redirects=False)
            self.assertEqual(res.status_code, 302)
            self.assertIn('/auth/login', res.headers['Location'])

    # -------------------------------------------------------------------------
    # 2. CATALOG SEARCH, FILTERING & SORTING
    # -------------------------------------------------------------------------
    def test_03_catalog_search_and_filtering(self):
        """Verify full-text search, genre filter, language filter, and sorting"""
        # Search by keyword
        res = self.client.get('/api/books?q=Atomic')
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertGreaterEqual(len(data['books']), 1)
        self.assertEqual(data['books'][0]['title'], 'Atomic Habits')

        # Filter by genre
        res_genre = self.client.get('/api/books?genre=Science')
        data_genre = res_genre.get_json()
        self.assertTrue(data_genre['success'])
        for b in data_genre['books']:
            self.assertTrue(any('science' in g.lower() for g in b['genres']))

        # Filter by language
        res_lang = self.client.get('/api/books?language=English')
        data_lang = res_lang.get_json()
        self.assertTrue(data_lang['success'])
        self.assertGreaterEqual(len(data_lang['books']), 10)

        # Sort by rating descending
        res_sort = self.client.get('/api/books?sort=rating-desc')
        data_sort = res_sort.get_json()
        self.assertTrue(data_sort['success'])
        ratings = [b['rating'] for b in data_sort['books']]
        self.assertEqual(ratings, sorted(ratings, reverse=True))

    # -------------------------------------------------------------------------
    # 3. READING SHELVES, PROGRESS & HISTORY
    # -------------------------------------------------------------------------
    def test_04_reading_lifecycle_and_milestones(self):
        """Test Add to Library -> Update Progress -> Complete -> History Audit Trail"""
        with self.client.session_transaction() as sess:
            sess['_user_id'] = str(self.test_user_id)
            sess['_fresh'] = True

        # 1. Add 'Atomic Habits' (id=1, 320 pages) to 'want-to-read'
        res_add = self.client.post('/api/library', json={
            'bookId': 1,
            'status': 'want-to-read'
        })
        self.assertEqual(res_add.status_code, 200)
        ub_id = res_add.get_json()['book']['id']

        # Verify stats reflect 1 want-to-read
        res_stats = self.client.get('/api/user/stats')
        stats = res_stats.get_json()['stats']
        self.assertEqual(stats['want_to_read_books'], 1)
        self.assertEqual(stats['currently_reading_books'], 0)
        self.assertEqual(stats['completed_books'], 0)

        # 2. Move to 'currently-reading' and update progress to 160 pages
        res_progress = self.client.put(f'/api/library/{ub_id}', json={
            'status': 'currently-reading',
            'currentPage': 160
        })
        self.assertEqual(res_progress.status_code, 200)
        stats = res_progress.get_json()['stats']
        self.assertEqual(stats['want_to_read_books'], 0)
        self.assertEqual(stats['currently_reading_books'], 1)
        self.assertEqual(stats['total_pages_read'], 160)

        # 3. Complete the book (320 pages)
        res_complete = self.client.put(f'/api/library/{ub_id}', json={
            'currentPage': 320
        })
        self.assertEqual(res_complete.status_code, 200)
        stats = res_complete.get_json()['stats']
        self.assertEqual(stats['currently_reading_books'], 0)
        self.assertEqual(stats['completed_books'], 1)
        self.assertEqual(stats['total_pages_read'], 320)

        # 4. Verify Reading History log contains completion milestone
        res_history = self.client.get('/api/history')
        history_data = res_history.get_json()
        self.assertTrue(history_data['success'])
        actions = [h['action'] for h in history_data['history']]
        self.assertIn('completed', actions)
        self.assertIn('started', actions)
        self.assertIn('added', actions)

    # -------------------------------------------------------------------------
    # 4. WISHLIST MANAGEMENT & ATOMIC MOVE TO LIBRARY
    # -------------------------------------------------------------------------
    def test_05_wishlist_toggle_and_move_to_shelf(self):
        """Test adding to wishlist, toggling, and atomically moving to Want to Read shelf"""
        with self.client.session_transaction() as sess:
            sess['_user_id'] = str(self.test_user_id)
            sess['_fresh'] = True

        # Toggle book #2 into wishlist
        res_toggle = self.client.post('/api/wishlist/toggle', json={'bookId': 2})
        self.assertEqual(res_toggle.status_code, 200)
        self.assertEqual(res_toggle.get_json()['action'], 'added')

        # Verify wishlist item exists
        res_wishlist = self.client.get('/api/wishlist')
        wdata = res_wishlist.get_json()
        self.assertEqual(wdata['count'], 1)
        item_id = wdata['wishlist'][0]['id']

        # Move atomically to library shelf
        res_move = self.client.post(f'/api/wishlist/{item_id}/move-to-library', json={'shelf': 'want-to-read'})
        self.assertEqual(res_move.status_code, 200)

        # Verify removed from wishlist and present in user library
        res_wishlist_after = self.client.get('/api/wishlist')
        self.assertEqual(res_wishlist_after.get_json()['count'], 0)

        res_lib = self.client.get('/api/library')
        self.assertEqual(len(res_lib.get_json()['library']), 1)

    # -------------------------------------------------------------------------
    # 5. PROFILE, PASSWORD & NOTIFICATION PREFERENCES
    # -------------------------------------------------------------------------
    def test_06_profile_update_and_password_change(self):
        """Test updating personal info, notification preferences, and changing password securely"""
        with self.client.session_transaction() as sess:
            sess['_user_id'] = str(self.test_user_id)
            sess['_fresh'] = True

        # Update Personal Profile
        res_prof = self.client.post('/api/user/profile', json={
            'fullName': 'QA Lead Engineer',
            'phone': '+1 (555) 999-8888',
            'language': 'English',
            'emailNotifications': False,
            'readingReminders': True
        })
        self.assertTrue(res_prof.get_json()['success'])
        self.assertEqual(res_prof.get_json()['user']['fullName'], 'QA Lead Engineer')
        self.assertFalse(res_prof.get_json()['user']['emailNotifications'])

        # Change Password
        res_pwd = self.client.post('/api/user/password', json={
            'currentPassword': 'Password123!',
            'newPassword': 'NewSecurePassword456!'
        })
        self.assertTrue(res_pwd.get_json()['success'])

        # Verify login works with new password
        self.client.get('/auth/logout')
        res_login_new = self.client.post('/auth/login', data={
            'email': 'qa.reader@example.com',
            'password': 'NewSecurePassword456!'
        }, follow_redirects=True)
        self.assertIn(b'Dashboard', res_login_new.data)

    # -------------------------------------------------------------------------
    # 6. RECOMMENDATION ENGINE DETERMINISTIC SCORING
    # -------------------------------------------------------------------------
    def test_07_recommendation_engine_scoring(self):
        """Verify rule-based recommendation calculations, compatibility scores, and explanations"""
        with self.client.session_transaction() as sess:
            sess['_user_id'] = str(self.test_user_id)
            sess['_fresh'] = True

        res = self.client.get('/api/recommendations')
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertGreaterEqual(len(data['recommendations']), 1)

        for rec in data['recommendations']:
            score = rec['score']
            self.assertIsInstance(score, int)
            self.assertGreaterEqual(score, 0)
            self.assertLessEqual(score, 100)
            self.assertIn('explanation', rec)
            self.assertIn('reasons', rec)

    # -------------------------------------------------------------------------
    # 7. CROSS-PAGE DATA SYNCHRONIZATION & SINGLE SOURCE OF TRUTH
    # -------------------------------------------------------------------------
    def test_08_cross_page_stats_service_consistency(self):
        """Verify stats_service provides exact unified counts matching database rows"""
        with self.app.app_context():
            user = db.session.get(User, self.test_user_id)

            # Add 2 completed books, 1 currently reading, 1 want-to-read
            ub1 = UserBook(user_id=user.id, book_id=1, status=STATUS_COMPLETED, current_page=320)
            ub2 = UserBook(user_id=user.id, book_id=2, status=STATUS_COMPLETED, current_page=280)
            ub3 = UserBook(user_id=user.id, book_id=3, status=STATUS_CURRENTLY_READING, current_page=100)
            ub4 = UserBook(user_id=user.id, book_id=4, status=STATUS_WANT_TO_READ, current_page=0)
            db.session.add_all([ub1, ub2, ub3, ub4])
            db.session.commit()

            stats = get_user_reading_stats(user.id)
            self.assertEqual(stats['completed_books'], 2)
            self.assertEqual(stats['currently_reading_books'], 1)
            self.assertEqual(stats['want_to_read_books'], 1)
            self.assertEqual(stats['total_library_books'], 4)
            # Completed books (Atomic Habits: 320, Sapiens: 496) + Currently Reading (100) = 916
            self.assertEqual(stats['total_pages_read'], 320 + 496 + 100)

    # -------------------------------------------------------------------------
    # 8. ERROR HANDLING & SECURITY BOUNDARIES
    # -------------------------------------------------------------------------
    def test_09_security_and_edge_case_handling(self):
        """Test negative progress clamping, unauthorized record deletion, non-existent books"""
        with self.app.app_context():
            other_user = User(username='other_u', email='other@example.com', full_name='Other', password_hash='hash')
            db.session.add(other_user)
            db.session.flush()
            other_ub = UserBook(user_id=other_user.id, book_id=1, status='want-to-read')
            db.session.add(other_ub)
            db.session.commit()
            other_ub_id = other_ub.id

        with self.client.session_transaction() as sess:
            sess['_user_id'] = str(self.test_user_id)
            sess['_fresh'] = True

        # 1. Attempting to delete another user's library item returns 404 unauthorized
        res_del = self.client.delete(f'/api/library/{other_ub_id}')
        self.assertEqual(res_del.status_code, 404)

        # 2. Adding non-existent book returns 404
        res_bad_book = self.client.post('/api/library', json={'bookId': 99999})
        self.assertEqual(res_bad_book.status_code, 404)

        # 3. Clamping invalid negative pages safely
        res_my_ub = self.client.post('/api/library', json={'bookId': 5, 'status': 'currently-reading'})
        my_ub_id = res_my_ub.get_json()['book']['id']
        res_clamp = self.client.put(f'/api/library/{my_ub_id}', json={'currentPage': -50})
        self.assertEqual(res_clamp.get_json()['book']['currentPage'], 0)


if __name__ == '__main__':
    unittest.main()
