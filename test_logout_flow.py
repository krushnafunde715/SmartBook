"""
Test One-Click Logout and Redirect to Landing Page (/)
"""
import sys
from app import create_app, db
from models import User

def test_logout_flow():
    app = create_app()
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False

    client = app.test_client()

    with app.app_context():
        # 1. Login with demo user
        login_res = client.post('/auth/login', data={
            'email': 'krushna.patel@example.com',
            'password': 'password123'
        }, follow_redirects=True)
        assert login_res.status_code == 200
        assert b'krushna.patel@example.com' in login_res.data or b'Dashboard' in login_res.data
        print("[PASS] 1. Login successful")

        # 2. Access dashboard authenticated
        dash_res = client.get('/dashboard')
        assert dash_res.status_code == 200
        assert dash_res.headers.get('Cache-Control') is not None
        assert 'no-cache' in dash_res.headers.get('Cache-Control')
        print(f"[PASS] 2. Authenticated /dashboard access 200 OK, Cache-Control: {dash_res.headers.get('Cache-Control')}")

        # 3. Perform POST Logout
        logout_res = client.post('/auth/logout', follow_redirects=False)
        assert logout_res.status_code == 302
        assert logout_res.location == '/' or logout_res.location.endswith('/')
        print(f"[PASS] 3. POST /auth/logout returned 302 redirect directly to: {logout_res.location}")

        # 4. Follow redirect to landing page
        landing_res = client.get(logout_res.location)
        assert landing_res.status_code == 200
        assert b'SmartBook' in landing_res.data
        print("[PASS] 4. Landing page rendered with 200 OK after logout")

        # 5. Access protected routes now -> must redirect to /auth/login
        protected_urls = ['/dashboard', '/explore', '/my-books', '/wishlist', '/history', '/profile']
        for url in protected_urls:
            prot_res = client.get(url, follow_redirects=False)
            assert prot_res.status_code == 302
            assert '/auth/login' in prot_res.location
            print(f"[PASS] 5. Unauthenticated access to {url} correctly redirects to {prot_res.location}")

        # 6. Test GET /auth/logout fallback
        client.post('/auth/login', data={'email': 'krushna.patel@example.com', 'password': 'password123'})
        get_logout_res = client.get('/auth/logout', follow_redirects=False)
        assert get_logout_res.status_code == 302
        assert get_logout_res.location == '/' or get_logout_res.location.endswith('/')
        print(f"[PASS] 6. GET /auth/logout fallback returned 302 redirect to: {get_logout_res.location}")

        # 7. Re-login test
        relogin_res = client.post('/auth/login', data={
            'email': 'krushna.patel@example.com',
            'password': 'password123'
        }, follow_redirects=True)
        assert relogin_res.status_code == 200
        assert b'Dashboard' in relogin_res.data
        print("[PASS] 7. Re-login creates fresh valid session successfully")

    print("\nALL LOGOUT TESTS PASSED PERFECTLY!")

if __name__ == '__main__':
    test_logout_flow()
