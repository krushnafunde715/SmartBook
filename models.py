"""
SmartBook — Database Models
SQLAlchemy ORM Entities for User Identity, Catalog, Shelves, Wishlist, Reading History, and Recommendations.
"""

from datetime import datetime, timezone, date
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import json

def utcnow():
    """Return timezone-naive UTC datetime compatible with SQLAlchemy and database drivers."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

db = SQLAlchemy()

# Association Table: Book <-> Genre
book_genres = db.Table(
    'book_genres',
    db.Column('book_id', db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), primary_key=True),
    db.Column('genre_id', db.Integer, db.ForeignKey('genres.id', ondelete='CASCADE'), primary_key=True)
)

# Association Table: UserPreferences <-> Genre
user_preferred_genres = db.Table(
    'user_preferred_genres',
    db.Column('preference_id', db.Integer, db.ForeignKey('user_preferences.id', ondelete='CASCADE'), primary_key=True),
    db.Column('genre_id', db.Integer, db.ForeignKey('genres.id', ondelete='CASCADE'), primary_key=True)
)


class User(UserMixin, db.Model):
    """Authoritative User Account and Identity Record"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(30), nullable=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    preferred_language = db.Column(db.String(30), nullable=False, default='English')
    role = db.Column(db.String(20), nullable=False, default='user')
    profile_image = db.Column(db.Text, nullable=True)
    email_notifications = db.Column(db.Boolean, default=True)
    reading_reminders = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    # Relationships
    preference = db.relationship('UserPreferences', backref='user', uselist=False, cascade='all, delete-orphan')
    user_books = db.relationship('UserBook', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    wishlist_items = db.relationship('WishlistItem', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    reading_histories = db.relationship('ReadingHistory', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    recommendation_histories = db.relationship('RecommendationHistory', backref='user', lazy='dynamic', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def avatar_url(self):
        if self.profile_image and self.profile_image.strip():
            return self.profile_image.strip()
        # Fallback initials
        name_param = self.full_name or self.username or 'Reader'
        return f"https://ui-avatars.com/api/?name={name_param}&background=163E30&color=fff&size=160&bold=true"

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'fullName': self.full_name,
            'phone': self.phone or '',
            'dob': self.date_of_birth.strftime('%Y-%m-%d') if self.date_of_birth else '',
            'language': self.preferred_language,
            'role': self.role,
            'avatarUrl': self.avatar_url,
            'emailNotifications': self.email_notifications,
            'readingReminders': self.reading_reminders,
            'createdAt': self.created_at.strftime('%B %d, %Y'),
            'genres': [g.name for g in self.preference.preferred_genres] if self.preference else ['Technology', 'Self-Help', 'Science Fiction'],
            'readingGoal': str(self.preference.reading_goal) if self.preference else '30',
            'interests': self.preference.interests if self.preference else ''
        }


class Genre(db.Model):
    """Academic and Editorial Genre Taxonomy"""
    __tablename__ = 'genres'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    slug = db.Column(db.String(50), unique=True, nullable=False, index=True)
    description = db.Column(db.String(255), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description
        }


class Book(db.Model):
    """Canonical Book Entity"""
    __tablename__ = 'books'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False, index=True)
    author = db.Column(db.String(150), nullable=False, index=True)
    isbn = db.Column(db.String(30), unique=True, nullable=True)
    description = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(30), nullable=False, default='English', index=True)
    publication_year = db.Column(db.Integer, nullable=False)
    page_count = db.Column(db.Integer, nullable=False)
    reading_duration = db.Column(db.String(20), nullable=False)  # 'Short', 'Medium', 'Long'
    min_age = db.Column(db.Integer, nullable=False, default=0)
    max_age = db.Column(db.Integer, nullable=False, default=99)
    rating = db.Column(db.Float, nullable=False, default=0.0)
    cover_image = db.Column(db.String(255), nullable=True)
    cover_class = db.Column(db.String(50), nullable=True)
    cover_title = db.Column(db.String(100), nullable=True)
    cover_gradient = db.Column(db.String(255), nullable=True)
    is_featured = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    # Relationships
    genres = db.relationship('Genre', secondary=book_genres, backref=db.backref('books', lazy='dynamic'))

    def to_dict(self):
        primary_genre = self.genres[0].name if self.genres else 'General'
        genre_list = [g.name for g in self.genres]
        return {
            'id': self.id,
            'title': self.title,
            'author': self.author,
            'isbn': self.isbn,
            'description': self.description,
            'language': self.language,
            'publicationYear': self.publication_year,
            'pageCount': self.page_count,
            'readingDuration': self.reading_duration,
            'minAge': self.min_age,
            'maxAge': self.max_age,
            'rating': self.rating,
            'coverImage': self.cover_image or '',
            'coverClass': self.cover_class or 'atomic',
            'coverTitle': self.cover_title or self.title,
            'coverGradient': self.cover_gradient or '',
            'genre': primary_genre,
            'genres': genre_list,
            'isFeatured': self.is_featured
        }


class UserPreferences(db.Model):
    """User Reading Profile & Recommendation Preferences"""
    __tablename__ = 'user_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    preferred_language = db.Column(db.String(30), nullable=False, default='English')
    age_group = db.Column(db.String(30), nullable=False, default='Adult')
    reading_duration = db.Column(db.String(30), nullable=False, default='Any')
    reading_goal = db.Column(db.Integer, nullable=False, default=30)
    interests = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    # Relationships
    preferred_genres = db.relationship('Genre', secondary=user_preferred_genres, lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'preferredLanguage': self.preferred_language,
            'ageGroup': self.age_group,
            'readingDuration': self.reading_duration,
            'readingGoal': self.reading_goal,
            'interests': self.interests or '',
            'preferredGenres': [g.name for g in self.preferred_genres],
            'preferredGenreIds': [g.id for g in self.preferred_genres]
        }


class UserBook(db.Model):
    """User Library Shelves & Reading Progress Tracker"""
    __tablename__ = 'user_books'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), nullable=False, index=True)
    status = db.Column(db.String(30), nullable=False, default='want-to-read', index=True)  # currently-reading, want-to-read, completed
    current_page = db.Column(db.Integer, nullable=False, default=0)
    user_rating = db.Column(db.Float, nullable=True)
    review = db.Column(db.Text, nullable=True)
    added_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'book_id', name='uq_user_book'),
    )

    book = db.relationship('Book', backref=db.backref('user_books', cascade='all, delete-orphan'))

    def to_dict(self):
        b = self.book
        primary_genre = b.genres[0].name if b.genres else 'General'
        return {
            'id': self.id,
            'bookId': self.book_id,
            'title': b.title,
            'author': b.author,
            'genre': primary_genre,
            'genres': [g.name for g in b.genres],
            'status': self.status,
            'currentPage': self.current_page,
            'totalPages': b.page_count,
            'rating': self.user_rating if self.user_rating is not None else b.rating,
            'bookRating': b.rating,
            'coverClass': b.cover_class or 'atomic',
            'coverTitle': b.cover_title or b.title,
            'coverGradient': b.cover_gradient or '',
            'synopsis': b.description,
            'review': self.review or '',
            'addedDate': self.added_at.strftime('%Y-%m-%d'),
            'completedDate': self.completed_at.strftime('%Y-%m-%d') if self.completed_at else None
        }


class WishlistItem(db.Model):
    """User Saved Wishlist Items"""
    __tablename__ = 'wishlist'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), nullable=False, index=True)
    added_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'book_id', name='uq_user_wishlist'),
    )

    book = db.relationship('Book', backref=db.backref('wishlist_items', cascade='all, delete-orphan'))

    def to_dict(self):
        b = self.book
        primary_genre = b.genres[0].name if b.genres else 'General'
        return {
            'id': self.id,
            'bookId': self.book_id,
            'title': b.title,
            'author': b.author,
            'genre': primary_genre,
            'rating': b.rating,
            'pages': b.page_count,
            'coverClass': b.cover_class or 'atomic',
            'coverTitle': b.cover_title or b.title,
            'coverGradient': b.cover_gradient or '',
            'desc': b.description[:140] + '...' if len(b.description) > 140 else b.description,
            'synopsis': b.description,
            'addedDate': self.added_at.strftime('%Y-%m-%d')
        }


class ReadingHistory(db.Model):
    """Audit Log of User Reading Milestones and History"""
    __tablename__ = 'reading_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False)  # added, started, updated_progress, completed, reviewed, removed
    details = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    book = db.relationship('Book', backref=db.backref('reading_histories', cascade='all, delete-orphan'))

    def to_dict(self):
        b = self.book
        primary_genre = b.genres[0].name if b.genres else 'General'
        return {
            'id': self.id,
            'bookId': self.book_id,
            'title': b.title,
            'author': b.author,
            'genre': primary_genre,
            'action': self.action,
            'details': self.details,
            'rating': b.rating,
            'pages': b.page_count,
            'coverClass': b.cover_class or 'atomic',
            'coverTitle': b.cover_title or b.title,
            'coverGradient': b.cover_gradient or '',
            'completedDate': self.created_at.strftime('%Y-%m-%d'),
            'createdAt': self.created_at.strftime('%B %d, %Y')
        }


class RecommendationRule(db.Model):
    """Deterministic Rule Weight Definition"""
    __tablename__ = 'recommendation_rules'

    id = db.Column(db.Integer, primary_key=True)
    rule_name = db.Column(db.String(50), nullable=False)
    rule_code = db.Column(db.String(50), unique=True, nullable=False)
    category = db.Column(db.String(30), nullable=False)  # genre, language, age, duration, interest
    max_weight = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    description = db.Column(db.Text, nullable=False)


class RecommendationHistory(db.Model):
    """Snapshot of Generated Recommendations"""
    __tablename__ = 'recommendation_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    generated_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    preferences_snapshot = db.Column(db.Text, nullable=False)
    results_snapshot = db.Column(db.Text, nullable=False)
