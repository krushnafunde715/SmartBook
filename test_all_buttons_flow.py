import unittest
import json
from app import app, db
from models import User, Book, UserBook, WishlistItem, ReadingHistory, UserPreferences

class SmartBookFullButtonAuditTests(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.app.config['TESTING'] = True
        self.app.config['WTF_CSRF_ENABLED'] = False
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def login_demo_user(self):
        return self.client.post('/auth/login', data={
            'email': 'krushna.patel@example.com',
            'password': 'password123'
        }, follow_redirects=True)

    def test_01_landing_and_public_routes(self):
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'SmartBook', res.data)

        # Unauthenticated access to dashboard should redirect to login
        res_dash = self.client.get('/dashboard', follow_redirects=False)
        self.assertEqual(res_dash.status_code, 302)
        self.assertIn('/auth/login', res_dash.location)

    def test_02_auth_and_dashboard_flow(self):
        # 1. Login
        login_res = self.login_demo_user()
        self.assertEqual(login_res.status_code, 200)

        # 2. Get Dashboard
        dash_res = self.client.get('/dashboard')
        self.assertEqual(dash_res.status_code, 200)
        self.assertIn(b'Edit Preferences', dash_res.data)
        self.assertIn(b'sbPreferencesModal', dash_res.data)

        # 3. Test Preferences GET API
        pref_res = self.client.get('/api/user/preferences')
        self.assertEqual(pref_res.status_code, 200)
        pref_data = pref_res.get_json()
        self.assertTrue(pref_data.get('success'))
        self.assertIn('preferences', pref_data)

        # 4. Test Preferences POST/PUT API (Dashboard "Edit Preferences" Save Action)
        update_pref_res = self.client.post('/api/user/preferences',
            data=json.dumps({
                'preferredGenres': ['Sci-Fi', 'Psychology', 'Design'],
                'language': 'English',
                'readingDuration': '45 mins/day',
                'readingGoal': 24,
                'interests': 'ai, cognition, system design'
            }),
            content_type='application/json'
        )
        self.assertEqual(update_pref_res.status_code, 200)
        up_data = update_pref_res.get_json()
        self.assertTrue(up_data.get('success'))
        self.assertIn('Science Fiction', up_data['preferences']['preferredGenres'])

        # 5. Test Recommendations API returns updated recommendations
        rec_res = self.client.get('/api/recommendations')
        self.assertEqual(rec_res.status_code, 200)
        rec_data = rec_res.get_json()
        self.assertTrue(rec_data.get('success'))
        self.assertGreater(len(rec_data.get('recommendations', [])), 0)

    def test_03_explore_and_book_details_flow(self):
        self.login_demo_user()

        # Explore page
        explore_res = self.client.get('/explore')
        self.assertEqual(explore_res.status_code, 200)

        # Book Search API
        search_res = self.client.get('/api/books?q=Atomic')
        self.assertEqual(search_res.status_code, 200)
        search_data = search_res.get_json()
        self.assertGreater(len(search_data.get('books', [])), 0)
        book_id = search_data['books'][0]['id']

        # Recommendation Explain / Details API
        detail_res = self.client.get(f'/api/recommendations/explain/{book_id}')
        self.assertEqual(detail_res.status_code, 200)
        book_details = detail_res.get_json()
        self.assertEqual(book_details.get('book', {}).get('id'), book_id)

    def test_04_library_and_reading_progress_lifecycle(self):
        self.login_demo_user()
        user = User.query.filter_by(email='krushna.patel@example.com').first()
        book = Book.query.first()

        # Clean existing record if any
        UserBook.query.filter_by(user_id=user.id, book_id=book.id).delete()
        db.session.commit()

        # 1. Add Book to Library Shelf: want-to-read
        add_res = self.client.post('/api/library',
            data=json.dumps({'bookId': book.id, 'status': 'want-to-read'}),
            content_type='application/json'
        )
        self.assertEqual(add_res.status_code, 200)
        ub_id = add_res.get_json()['book']['id']

        # 2. Update Progress: move to currently-reading, page 50
        update_res = self.client.put(f'/api/library/{ub_id}',
            data=json.dumps({'status': 'currently-reading', 'currentPage': 50, 'rating': 4}),
            content_type='application/json'
        )
        self.assertEqual(update_res.status_code, 200)

        # 3. Finish Book: completed
        finish_res = self.client.put(f'/api/library/{ub_id}',
            data=json.dumps({'status': 'completed', 'currentPage': book.page_count, 'rating': 5}),
            content_type='application/json'
        )
        self.assertEqual(finish_res.status_code, 200)

        # Verify reading history recorded
        history_entry = ReadingHistory.query.filter_by(user_id=user.id, book_id=book.id).first()
        self.assertIsNotNone(history_entry)

    def test_05_wishlist_lifecycle(self):
        self.login_demo_user()
        user = User.query.filter_by(email='krushna.patel@example.com').first()
        book = Book.query.order_by(Book.id.desc()).first()

        # Clear existing
        WishlistItem.query.filter_by(user_id=user.id, book_id=book.id).delete()
        UserBook.query.filter_by(user_id=user.id, book_id=book.id).delete()
        db.session.commit()

        # 1. Add to wishlist
        w_add = self.client.post('/api/wishlist',
            data=json.dumps({'bookId': book.id}),
            content_type='application/json'
        )
        self.assertEqual(w_add.status_code, 200)
        item_id = w_add.get_json()['item']['id']

        # 2. Move from wishlist to library (want-to-read)
        w_move = self.client.post(f'/api/wishlist/{item_id}/move-to-library',
            data=json.dumps({}),
            content_type='application/json'
        )
        self.assertEqual(w_move.status_code, 200)

        # Verify it is removed from wishlist and added to user books
        w_check = WishlistItem.query.filter_by(user_id=user.id, book_id=book.id).first()
        ub_check = UserBook.query.filter_by(user_id=user.id, book_id=book.id).first()
        self.assertIsNone(w_check)
        self.assertIsNotNone(ub_check)

    def test_06_profile_and_account_settings(self):
        self.login_demo_user()

        # 1. Get profile page
        prof_page = self.client.get('/profile')
        self.assertEqual(prof_page.status_code, 200)

        # 2. Update profile information
        prof_update = self.client.put('/api/user/profile',
            data=json.dumps({
                'fullName': 'Krushna Patel',
                'phone': '+1 (555) 234-5678',
                'dob': '1995-06-15',
                'language': 'English',
                'emailNotifications': True,
                'readingReminders': False
            }),
            content_type='application/json'
        )
        self.assertEqual(prof_update.status_code, 200)
        prof_res_data = prof_update.get_json()
        self.assertTrue(prof_res_data.get('success'))

    def test_07_logout_flow_and_redirect(self):
        self.login_demo_user()

        # Logout action via POST
        logout_res = self.client.post('/auth/logout', follow_redirects=False)
        self.assertEqual(logout_res.status_code, 302)
        self.assertEqual(logout_res.location, '/')

        # Ensure session is terminated and cannot access protected route
        protected_res = self.client.get('/dashboard', follow_redirects=False)
        self.assertEqual(protected_res.status_code, 302)
        self.assertIn('/auth/login', protected_res.location)

if __name__ == '__main__':
    unittest.main()
