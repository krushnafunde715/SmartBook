"""
SmartBook — Comprehensive Alert System Verification Suite
Tests alert markup, styles, JavaScript inclusion, and flash messages across all pages.
"""
from app import create_app, db
from models import User

def test_alert_system():
    app = create_app()
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    client = app.test_client()

    with app.app_context():
        # 1. Landing Page Verification
        res = client.get('/')
        assert res.status_code == 200
        assert b'alerts.css' in res.data
        assert b'alerts.js' in res.data
        assert b'sb-global-toast-container' in res.data
        print("[PASS] 1. Landing page includes alerts.css, alerts.js, and toast container")

        # 2. Login Page with Flash Error
        login_res = client.post('/auth/login', data={
            'email': 'nonexistent@example.com',
            'password': 'wrongpassword'
        }, follow_redirects=True)
        assert login_res.status_code == 200
        assert b'sb-alert' in login_res.data
        assert b'sb-alert-danger' in login_res.data
        assert b'sb-alert-close' in login_res.data
        assert b'Invalid email address or password' in login_res.data
        print("[PASS] 2. Login failure renders unified .sb-alert-danger inside login card with close button")

        # 3. Registration Page with Flash Warning
        reg_res = client.post('/auth/register', data={
            'full_name': 'Test User',
            'email': 'krushna.patel@example.com', # already exists
            'password': 'password123',
            'confirm_password': 'password123',
            'terms': 'on'
        }, follow_redirects=True)
        assert reg_res.status_code == 200
        assert b'sb-alert' in reg_res.data
        assert b'sb-alert-warning' in reg_res.data
        assert b'An account with this email already exists' in reg_res.data
        print("[PASS] 3. Registration duplicate email renders unified .sb-alert-warning")

        # 4. Authenticate User for Protected Views
        client.post('/auth/login', data={
            'email': 'krushna.patel@example.com',
            'password': 'password123'
        }, follow_redirects=True)

        pages = [
            ('/dashboard', 'Dashboard'),
            ('/explore', 'Explore Books'),
            ('/my-books', 'My Books'),
            ('/wishlist', 'My Wishlist'),
            ('/history', 'Reading History'),
            ('/profile', 'My Profile')
        ]

        for endpoint, page_name in pages:
            page_res = client.get(endpoint)
            assert page_res.status_code == 200
            assert b'alerts.css' in page_res.data, f"alerts.css missing on {page_name}"
            assert b'alerts.js' in page_res.data, f"alerts.js missing on {page_name}"
            assert b'sb-global-toast-container' in page_res.data, f"Toast container missing on {page_name}"
            assert b'sb-confirm-modal' in page_res.data, f"Confirm modal missing on {page_name}"
            print(f"[PASS] 4. {page_name} ({endpoint}) has alerts.css, alerts.js, toast stack, and confirm modal")

        print("\nALL GLOBAL ALERT SYSTEM BACKEND & TEMPLATE TESTS PASSED!")

if __name__ == '__main__':
    test_alert_system()
