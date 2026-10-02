import unittest
import json
from app import create_app, db
from models import User, Book, UserBook, ReadingHistory, WishlistItem
from stats_service import get_user_reading_stats, normalize_status

class TestCompletedBooksSync(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['WTF_CSRF_ENABLED'] = False
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def login(self, email='krushna.patel@example.com', password='password123'):
        return self.client.post('/auth/login', data={
            'email': email,
            'password': password
        }, follow_redirects=True)

    def test_01_authoritative_stats_match_across_pages(self):
        """Verify Dashboard, My Books, Reading History, and API show matching completed counts"""
        self.login()
        user = User.query.filter_by(email='krushna.patel@example.com').first()
        stats = get_user_reading_stats(user.id)
        completed_count = stats['completed_books']

        # 1. API Stats Check
        api_res = self.client.get('/api/user/stats')
        self.assertEqual(api_res.status_code, 200)
        api_data = api_res.get_json()
        self.assertTrue(api_data['success'])
        self.assertEqual(api_data['stats']['completed_books'], completed_count)

        # 2. History API Check
        hist_api_res = self.client.get('/api/history')
        self.assertEqual(hist_api_res.status_code, 200)
        hist_data = hist_api_res.get_json()
        self.assertEqual(len(hist_data['completedBooks']), completed_count)
        self.assertEqual(hist_data['stats']['completed_books'], completed_count)

        # 3. Dashboard HTML Check
        dash_res = self.client.get('/dashboard')
        self.assertEqual(dash_res.status_code, 200)
        dash_html = dash_res.data.decode('utf-8')
        self.assertIn(f'id="dashCountCompleted">{completed_count}</span>', dash_html)

        # 4. My Books HTML Check
        my_books_res = self.client.get('/my-books')
        self.assertEqual(my_books_res.status_code, 200)
        my_books_html = my_books_res.data.decode('utf-8')
        self.assertIn(f'id="tabCountCompleted">{completed_count}</span>', my_books_html)

        # 5. History HTML Check
        hist_page_res = self.client.get('/history')
        self.assertEqual(hist_page_res.status_code, 200)
        hist_page_html = hist_page_res.data.decode('utf-8')
        self.assertIn(f'id="historyFinishedCount">{completed_count}</strong>', hist_page_html)
        self.assertIn(f'id="metricCompleted">{completed_count}</span>', hist_page_html)

    def test_02_mark_book_completed_lifecycle(self):
        """Marking a book as completed increments completed count across all views"""
        self.login()
        user = User.query.filter_by(email='krushna.patel@example.com').first()
        initial_stats = get_user_reading_stats(user.id)
        initial_completed = initial_stats['completed_books']
        initial_reading = initial_stats['currently_reading_books']

        # Find a currently reading book (e.g. Atomic Habits or Project Hail Mary)
        ub = UserBook.query.filter_by(user_id=user.id, status='currently-reading').first()
        self.assertIsNotNone(ub, "Must have at least one currently reading book")
        book_id = ub.book_id
        ub_id = ub.id

        # Update status to completed
        update_res = self.client.put(f'/api/library/{ub_id}',
            data=json.dumps({
                'status': 'completed',
                'currentPage': ub.book.page_count,
                'rating': 5.0,
                'review': 'Phenomenal read! Highly recommended.'
            }),
            content_type='application/json'
        )
        self.assertEqual(update_res.status_code, 200)
        json_data = update_res.get_json()
        self.assertTrue(json_data['success'])
        self.assertEqual(json_data['stats']['completed_books'], initial_completed + 1)
        self.assertEqual(json_data['stats']['currently_reading_books'], initial_reading - 1)

        # Verify in database
        updated_ub = db.session.get(UserBook, ub_id)
        self.assertEqual(updated_ub.status, 'completed')
        self.assertIsNotNone(updated_ub.completed_at)

        # Verify ReadingHistory record created without duplication
        history_events = ReadingHistory.query.filter_by(user_id=user.id, book_id=book_id, action='completed').all()
        self.assertEqual(len(history_events), 1)

        # Verify Dashboard, My Books, and History views reflect the incremented count
        dash_res = self.client.get('/dashboard')
        self.assertIn(f'id="dashCountCompleted">{initial_completed + 1}</span>', dash_res.data.decode('utf-8'))

        my_books_res = self.client.get('/my-books')
        self.assertIn(f'id="tabCountCompleted">{initial_completed + 1}</span>', my_books_res.data.decode('utf-8'))

        hist_res = self.client.get('/history')
        self.assertIn(f'id="historyFinishedCount">{initial_completed + 1}</strong>', hist_res.data.decode('utf-8'))

        # Step 3: Revert / Read Again — Change status back to currently-reading
        reread_res = self.client.put(f'/api/library/{ub_id}',
            data=json.dumps({'status': 'currently-reading', 'currentPage': 0}),
            content_type='application/json'
        )
        self.assertEqual(reread_res.status_code, 200)
        revert_stats = reread_res.get_json()['stats']
        self.assertEqual(revert_stats['completed_books'], initial_completed)
        self.assertEqual(revert_stats['currently_reading_books'], initial_reading)

    def test_03_isolated_user_statistics(self):
        """Ensure new or different user with 0 completed books shows 0 everywhere"""
        # Create temporary isolated user
        test_email = 'isolated_reader@example.com'
        existing = User.query.filter_by(email=test_email).first()
        if not existing:
            new_u = User(
                username='isolated_reader',
                email=test_email,
                full_name='Isolated Reader',
                preferred_language='English'
            )
            new_u.set_password('password123')
            db.session.add(new_u)
            db.session.commit()

        self.login(email=test_email, password='password123')

        # Check API stats are 0
        stats_res = self.client.get('/api/user/stats')
        stats_data = stats_res.get_json()
        self.assertEqual(stats_data['stats']['completed_books'], 0)
        self.assertEqual(stats_data['stats']['total_books'], 0)

        # Check Dashboard shows 0
        dash_res = self.client.get('/dashboard')
        self.assertIn('id="dashCountCompleted">0</span>', dash_res.data.decode('utf-8'))

        # Check History page shows 0
        hist_res = self.client.get('/history')
        self.assertIn('id="historyFinishedCount">0</strong>', hist_res.data.decode('utf-8'))
        self.assertIn('id="metricCompleted">0</span>', hist_res.data.decode('utf-8'))

if __name__ == '__main__':
    unittest.main()
