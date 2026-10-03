"""
SmartBook — Authentication & Security Access Control Regression Tests
Verifies strict rejection of unauthenticated requests across all private page views and API endpoints.
Ensures zero data leakage, proper 302 login redirects for HTML views, and HTTP 401 for API endpoints.
"""

import unittest
from datetime import date
from config import TestingConfig
from app import create_app
from models import db, User, Genre, Book, UserPreferences, UserBook, WishlistItem, ReadingHistory
from stats_service import STATUS_WANT_TO_READ, STATUS_CURRENTLY_READING, STATUS_COMPLETED


class AuthSecurityBypassRegressionTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self._seed_fixtures()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _seed_fixtures(self):
        """Seed minimal fixtures for authentication testing"""
        # Genres
        g1 = Genre(name='Science Fiction', slug='science-fiction', description='SciFi genre')
        g2 = Genre(name='Technology', slug='technology', description='Tech genre')
        db.session.add_all([g1, g2])
        db.session.flush()

        # Demo / Target User
        u = User(
            username='krushna_patel',
            email='krushna.patel@example.com',
            full_name='Krushna Patel',
            preferred_language='English',
            date_of_birth=date(1998, 1, 1),
            role='user'
        )
        u.set_password('password123')
        db.session.add(u)
        db.session.flush()

        pref = UserPreferences(
            user_id=u.id,
            preferred_language='English',
            age_group='Adult',
            reading_duration='Medium',
            reading_goal=24,
            interests='technology space artificial intelligence'
        )
        pref.preferred_genres = [g1, g2]
        db.session.add(pref)

        # Books
        b1 = Book(
            title='Project Hail Mary',
            author='Andy Weir',
            isbn='9780593135204',
            page_count=496,
            reading_duration='Medium',
            language='English',
            publication_year=2021,
            rating=4.8,
            min_age=14,
            max_age=99,
            cover_class='cover-teal',
            description='A lone astronaut must save the Earth.'
        )
        b1.genres = [g1]

        b2 = Book(
            title='Clean Code',
            author='Robert C. Martin',
            isbn='9780132350884',
            page_count=464,
            reading_duration='Medium',
            language='English',
            publication_year=2008,
            rating=4.7,
            min_age=16,
            max_age=99,
            cover_class='cover-blue',
            description='A handbook of agile software craftsmanship.'
        )
        b2.genres = [g2]

        db.session.add_all([b1, b2])
        db.session.flush()

        # User Books & Wishlist
        ub = UserBook(user_id=u.id, book_id=b1.id, status=STATUS_CURRENTLY_READING, current_page=120)
        wl = WishlistItem(user_id=u.id, book_id=b2.id)
        db.session.add_all([ub, wl])
        db.session.commit()

        self.user_id = u.id
        self.book1_id = b1.id
        self.book2_id = b2.id
        self.ub_id = ub.id
        self.wl_id = wl.id

    def login(self):
        """Helper to establish an authenticated session"""
        return self.client.post('/auth/login', data={
            'email': 'krushna.patel@example.com',
            'password': 'password123'
        }, follow_redirects=True)

    # -------------------------------------------------------------------------
    # 1. PRIVATE HTML VIEW PROTECTION (MUST REDIRECT TO /auth/login)
    # -------------------------------------------------------------------------

    def test_01_unauthenticated_private_pages_redirect_to_login(self):
        """All private page routes must redirect unauthenticated requests to login view with 302"""
        private_views = [
            '/dashboard',
            '/my-books',
            '/wishlist',
            '/history',
            '/profile',
            '/explore'
        ]

        for path in private_views:
            res = self.client.get(path, follow_redirects=False)
            self.assertEqual(res.status_code, 302, f"Failed for path: {path}")
            loc = res.headers.get('Location', '')
            self.assertIn('/auth/login', loc, f"Redirect location missing login for: {path}")
            self.assertIn('next=', loc, f"Next param missing for: {path}")

    def test_02_authenticated_private_pages_render_successfully(self):
        """Authenticated users can access private page routes with 200 OK"""
        self.login()
        private_views = [
            '/dashboard',
            '/my-books',
            '/wishlist',
            '/history',
            '/profile',
            '/explore'
        ]

        for path in private_views:
            res = self.client.get(path)
            self.assertEqual(res.status_code, 200, f"Authenticated user failed to access: {path}")

    # -------------------------------------------------------------------------
    # 2. PRIVATE REST API ENDPOINTS (MUST RETURN HTTP 401 UNAUTHORIZED)
    # -------------------------------------------------------------------------

    def test_03_unauthenticated_api_requests_return_401(self):
        """All user-specific API endpoints must return HTTP 401 when accessed without authentication"""
        private_api_calls = [
            ('GET', '/api/user/me', None),
            ('GET', '/api/user/stats', None),
            ('POST', '/api/user/profile', {'fullName': 'Hacker'}),
            ('PUT', '/api/user/profile', {'fullName': 'Hacker'}),
            ('GET', '/api/user/preferences', None),
            ('POST', '/api/user/preferences', {'interests': 'hacked'}),
            ('POST', '/api/user/password', {'currentPassword': 'password123', 'newPassword': 'hackedpassword'}),
            ('POST', '/api/user/change-password', {'currentPassword': 'password123', 'newPassword': 'hackedpassword'}),
            ('GET', '/api/library', None),
            ('POST', '/api/library', {'bookId': self.book2_id, 'status': 'want-to-read'}),
            ('PUT', f'/api/library/{self.ub_id}', {'currentPage': 200}),
            ('DELETE', f'/api/library/{self.ub_id}', None),
            ('GET', '/api/wishlist', None),
            ('POST', '/api/wishlist', {'bookId': self.book1_id}),
            ('DELETE', f'/api/wishlist/{self.wl_id}', None),
            ('POST', '/api/wishlist/toggle', {'bookId': self.book1_id}),
            ('POST', f'/api/wishlist/{self.wl_id}/move-to-library', None),
            ('GET', '/api/history', None),
            ('GET', '/api/recommendations', None),
            ('GET', f'/api/recommendations/explain/{self.book1_id}', None),
        ]

        for method, endpoint, json_payload in private_api_calls:
            if method == 'GET':
                res = self.client.get(endpoint)
            elif method == 'POST':
                res = self.client.post(endpoint, json=json_payload or {})
            elif method == 'PUT':
                res = self.client.put(endpoint, json=json_payload or {})
            elif method == 'DELETE':
                res = self.client.delete(endpoint)

            self.assertEqual(res.status_code, 401, f"Unauthenticated request to {method} {endpoint} did not return 401! Returned: {res.status_code}")
            data = res.get_json()
            self.assertIsNotNone(data, f"Endpoint {endpoint} did not return JSON on 401")
            self.assertFalse(data.get('success'), f"Endpoint {endpoint} success flag was not False")

    def test_04_authenticated_api_requests_work_correctly(self):
        """Authenticated users can access their API endpoints and receive their own data"""
        self.login()

        # 1. User profile API
        res_me = self.client.get('/api/user/me')
        self.assertEqual(res_me.status_code, 200)
        self.assertEqual(res_me.get_json()['user']['email'], 'krushna.patel@example.com')

        # 2. User Stats API
        res_stats = self.client.get('/api/user/stats')
        self.assertEqual(res_stats.status_code, 200)
        self.assertTrue(res_stats.get_json()['success'])

        # 3. User Library API
        res_lib = self.client.get('/api/library')
        self.assertEqual(res_lib.status_code, 200)
        self.assertEqual(len(res_lib.get_json()['books']), 1)

        # 4. User Wishlist API
        res_wl = self.client.get('/api/wishlist')
        self.assertEqual(res_wl.status_code, 200)
        self.assertEqual(len(res_wl.get_json()['items']), 1)

        # 5. User Recommendations API
        res_recs = self.client.get('/api/recommendations')
        self.assertEqual(res_recs.status_code, 200)
        self.assertTrue(res_recs.get_json()['success'])

    # -------------------------------------------------------------------------
    # 3. PUBLIC ENDPOINTS REMAIN ACCESSIBLE WITHOUT AUTHENTICATION
    # -------------------------------------------------------------------------

    def test_05_public_routes_remain_accessible(self):
        """Public views and catalog endpoints must remain accessible to guest users"""
        # Landing Page
        res_landing = self.client.get('/')
        self.assertEqual(res_landing.status_code, 200)

        # Login View
        res_login = self.client.get('/auth/login')
        self.assertEqual(res_login.status_code, 200)

        # Register View
        res_reg = self.client.get('/auth/register')
        self.assertEqual(res_reg.status_code, 200)

        # Health Checks
        res_health = self.client.get('/health')
        self.assertEqual(res_health.status_code, 200)
        res_api_health = self.client.get('/api/health')
        self.assertEqual(res_api_health.status_code, 200)

        # Public Catalog Search & Details
        res_books = self.client.get('/api/books')
        self.assertEqual(res_books.status_code, 200)
        self.assertEqual(res_books.get_json()['count'], 2)

        res_book_detail = self.client.get(f'/api/books/{self.book1_id}')
        self.assertEqual(res_book_detail.status_code, 200)
        self.assertEqual(res_book_detail.get_json()['book']['title'], 'Project Hail Mary')


if __name__ == '__main__':
    unittest.main()
