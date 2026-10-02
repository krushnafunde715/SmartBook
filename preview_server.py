"""
SmartBook — Minimalist Frontend Preview Server
Built using Python Standard Library with zero external dependencies.
Renders Jinja-like template composition for index, login, register, and dashboard pages.
"""

import http.server
import socketserver
import os
import mimetypes
import re

PORT = 5000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_template_with_base(template_path, title_default="SmartBook"):
    """Loads a child template extending base.html and merges content into base.html"""
    base_file = os.path.join(BASE_DIR, "templates", "base.html")
    child_file = os.path.join(BASE_DIR, "templates", template_path)

    with open(base_file, "r", encoding="utf-8") as f:
        base_html = f.read()
    with open(child_file, "r", encoding="utf-8") as f:
        child_html = f.read()

    # Extract block title
    title_match = re.search(r"{%\s*block title\s*%}(.*?){%\s*endblock\s*%}", child_html, re.DOTALL)
    title = title_match.group(1).strip() if title_match else title_default

    # Extract block extra_css
    extra_css_match = re.search(r"{%\s*block extra_css\s*%}(.*?){%\s*endblock\s*%}", child_html, re.DOTALL)
    extra_css = extra_css_match.group(1).strip() if extra_css_match else ""

    # Extract block content
    content_match = re.search(r"{%\s*block content\s*%}(.*?){%\s*endblock\s*%}", child_html, re.DOTALL)
    content = content_match.group(1).strip() if content_match else ""

    # Extract block extra_js
    extra_js_match = re.search(r"{%\s*block extra_js\s*%}(.*?){%\s*endblock\s*%}", child_html, re.DOTALL)
    extra_js = extra_js_match.group(1).strip() if extra_js_match else ""

    # Replace blocks in base.html
    rendered = re.sub(r"{%\s*block title\s*%}.*?{%\s*endblock\s*%}", title, base_html, flags=re.DOTALL)
    rendered = re.sub(r"{%\s*block extra_css\s*%}.*?{%\s*endblock\s*%}", extra_css, rendered, flags=re.DOTALL)
    rendered = re.sub(r"{%\s*block content\s*%}.*?{%\s*endblock\s*%}", content, rendered, flags=re.DOTALL)
    rendered = re.sub(r"{%\s*block extra_js\s*%}.*?{%\s*endblock\s*%}", extra_js, rendered, flags=re.DOTALL)

    # Clean template tag syntax for static and url_for fallbacks
    rendered = re.sub(r"\{\{.*?else\s*['\"](.*?)['\"]\s*\}\}", r"\1", rendered)
    rendered = re.sub(r"\{\{.*?\}\}", "", rendered)
    rendered = re.sub(r"\{%.*?%\}", "", rendered)

    return rendered

class SmartBookHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        if clean_path == "" or clean_path == "/":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            html = load_template_with_base("main/index.html", "Welcome to SmartBook")
            self.wfile.write(html.encode("utf-8"))
        elif clean_path == "/auth/login":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            html = load_template_with_base("auth/login.html", "Log In — SmartBook")
            self.wfile.write(html.encode("utf-8"))
        elif clean_path == "/auth/register":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            html = load_template_with_base("auth/register.html", "Create Account — SmartBook")
            self.wfile.write(html.encode("utf-8"))
        elif clean_path == "/dashboard":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            html = load_template_with_base("main/dashboard.html", "Dashboard — SmartBook")
            self.wfile.write(html.encode("utf-8"))
        elif clean_path == "/explore":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            html = load_template_with_base("main/explore.html", "Explore Books — SmartBook")
            self.wfile.write(html.encode("utf-8"))
        elif clean_path == "/my-books":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            html = load_template_with_base("main/my_books.html", "My Books — SmartBook")
            self.wfile.write(html.encode("utf-8"))
        elif clean_path == "/wishlist":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            html = load_template_with_base("main/wishlist.html", "My Wishlist — SmartBook")
            self.wfile.write(html.encode("utf-8"))
        elif clean_path == "/history":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            html = load_template_with_base("main/history.html", "Reading History — SmartBook")
            self.wfile.write(html.encode("utf-8"))
        elif clean_path == "/profile":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            html = load_template_with_base("main/profile.html", "My Profile — SmartBook")
            self.wfile.write(html.encode("utf-8"))
        elif self.path.startswith("/static/"):
            file_rel_path = self.path.lstrip("/")
            file_abs_path = os.path.join(BASE_DIR, file_rel_path)
            if os.path.exists(file_abs_path) and os.path.isfile(file_abs_path):
                mime_type, _ = mimetypes.guess_type(file_abs_path)
                self.send_response(200)
                self.send_header("Content-type", mime_type or "application/octet-stream")
                self.end_headers()
                with open(file_abs_path, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, f"Static File Not Found: {self.path}")
        else:
            self.send_response(302)
            self.send_header("Location", "/")
            self.end_headers()

    def do_POST(self):
        # Handle login / registration form post by gracefully redirecting to /dashboard
        self.send_response(303)
        self.send_header("Location", "/dashboard")
        self.end_headers()

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SmartBookHTTPRequestHandler) as httpd:
        print(f"SmartBook Preview Server running on http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
