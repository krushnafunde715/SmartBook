"""
SmartBook — Comprehensive Database Seeder
Seeds System Catalog (Genres, Books, Recommendation Rules) and Optional Demo User.
Idempotent and safe to run multiple times.
"""

import os
from datetime import datetime, date
from models import db, User, Genre, Book, UserPreferences, UserBook, WishlistItem, ReadingHistory, RecommendationRule


def seed_system_catalog():
    """
    Seeds essential baseline system data:
    - 10 core genres
    - 5 recommendation rules
    - 10 canonical library books
    """
    # 1. Seed Genres
    genres_data = [
        ('Technology', 'technology', 'Software craftsmanship, artificial intelligence, and computing systems.'),
        ('Self-Help', 'self-help', 'Personal growth, behavioral psychology, and habit transformation.'),
        ('Science Fiction', 'science-fiction', 'Speculative futures, space exploration, and scientific wonder.'),
        ('Psychology', 'psychology', 'Human cognition, decision-making, and behavioral economics.'),
        ('Fiction', 'fiction', 'Timeless storytelling, literary classics, and narrative prose.'),
        ('Thriller', 'thriller', 'High-stakes suspense, psychological mysteries, and investigative plots.'),
        ('Biography', 'biography', 'Memoirs, biographical chronicles, and inspiring life narratives.'),
        ('Romance', 'romance', 'Emotional bonds, interpersonal dramas, and timeless relationships.'),
        ('History', 'history', 'World civilizations, geopolitical evolutions, and pivotal moments.'),
        ('Business', 'business', 'Entrepreneurship, wealth creation, strategy, and leadership.')
    ]

    genre_map = {}
    for name, slug, desc in genres_data:
        genre = Genre.query.filter_by(slug=slug).first()
        if not genre:
            genre = Genre(name=name, slug=slug, description=desc)
            db.session.add(genre)
            db.session.flush()
        genre_map[name] = genre

    # 2. Seed Recommendation Rules
    rules_data = [
        ('Genre Alignment Rule', 'GENRE_MATCH', 'genre', 40, 'Proportional overlap between user preferred genres and candidate book genres.'),
        ('Language Match Rule', 'LANG_EXACT', 'language', 20, 'Exact match between user interface language and book language.'),
        ('Age Appropriateness Rule', 'AGE_BOUND', 'age', 15, 'Evaluates reader age against book min and max age thresholds.'),
        ('Reading Duration Rule', 'DUR_PREF', 'duration', 15, 'Matches page count category (Short, Medium, Long) with user preference.'),
        ('Keyword Interest Rule', 'KEYWORD_INT', 'interest', 10, 'Tokenized keyword match between reader interests and book overview.')
    ]
    for name, code, cat, max_w, desc in rules_data:
        if not RecommendationRule.query.filter_by(rule_code=code).first():
            r = RecommendationRule(rule_name=name, rule_code=code, category=cat, max_weight=max_w, description=desc, is_active=True)
            db.session.add(r)

    # 3. Seed Books Catalog
    books_data = [
        {
            'title': 'Atomic Habits',
            'author': 'James Clear',
            'isbn': '9780735211292',
            'description': 'An extraordinarily practical guide that breaks down complex behavioral science into simple daily actions. James Clear draws on proven ideas from biology, psychology, and neuroscience to create an easy-to-understand system for making good habits inevitable and bad habits impossible.',
            'language': 'English',
            'publication_year': 2018,
            'page_count': 320,
            'reading_duration': 'Medium',
            'min_age': 14,
            'max_age': 99,
            'rating': 4.9,
            'cover_class': 'atomic',
            'cover_title': 'Atomic<br>Habits',
            'is_featured': True,
            'genres': ['Self-Help', 'Psychology']
        },
        {
            'title': 'Project Hail Mary',
            'author': 'Andy Weir',
            'isbn': '9780593135204',
            'description': 'Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself will perish. Except right now, he doesn\'t know that. He can\'t even remember his own name, let alone the nature of his assignment.',
            'language': 'English',
            'publication_year': 2021,
            'page_count': 496,
            'reading_duration': 'Medium',
            'min_age': 13,
            'max_age': 99,
            'rating': 4.9,
            'cover_class': 'hailmary',
            'cover_title': 'PROJECT<br>HAIL MARY',
            'cover_gradient': 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
            'is_featured': True,
            'genres': ['Science Fiction', 'Technology']
        },
        {
            'title': 'The Alchemist',
            'author': 'Paulo Coelho',
            'isbn': '9780062315007',
            'description': 'A mystical story of Santiago, an Andalusian shepherd boy who yearns to travel in search of a worldly treasure. His quest will lead him to riches far different and far more satisfying than he ever imagined.',
            'language': 'English',
            'publication_year': 1988,
            'page_count': 208,
            'reading_duration': 'Short',
            'min_age': 12,
            'max_age': 99,
            'rating': 4.8,
            'cover_class': 'alchemist',
            'cover_title': 'THE<br>ALCHEMIST',
            'is_featured': False,
            'genres': ['Fiction']
        },
        {
            'title': 'Clean Code',
            'author': 'Robert C. Martin',
            'isbn': '9780132350884',
            'description': 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees. Every year, countless hours and significant resources are lost because of poorly written code.',
            'language': 'English',
            'publication_year': 2008,
            'page_count': 464,
            'reading_duration': 'Medium',
            'min_age': 16,
            'max_age': 99,
            'rating': 4.7,
            'cover_class': 'clean',
            'cover_title': 'Clean Code',
            'is_featured': False,
            'genres': ['Technology']
        },
        {
            'title': 'Dune',
            'author': 'Frank Herbert',
            'isbn': '9780441172719',
            'description': 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the \'spice\' melange.',
            'language': 'English',
            'publication_year': 1965,
            'page_count': 688,
            'reading_duration': 'Long',
            'min_age': 14,
            'max_age': 99,
            'rating': 4.8,
            'cover_class': 'dune',
            'cover_title': 'DUNE',
            'is_featured': False,
            'genres': ['Science Fiction']
        },
        {
            'title': 'The Psychology of Money',
            'author': 'Morgan Housel',
            'isbn': '9780857197689',
            'description': 'Doing well with money isn\'t necessarily about what you know. It\'s about how you behave. And behavior is hard to teach, even to really smart people.',
            'language': 'English',
            'publication_year': 2020,
            'page_count': 256,
            'reading_duration': 'Short',
            'min_age': 15,
            'max_age': 99,
            'rating': 4.8,
            'cover_class': 'psychology',
            'cover_title': 'PSYCHOLOGY<br>OF MONEY',
            'cover_gradient': 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
            'is_featured': True,
            'genres': ['Business', 'Psychology', 'Self-Help']
        },
        {
            'title': 'Thinking, Fast and Slow',
            'author': 'Daniel Kahneman',
            'isbn': '9780374533557',
            'description': 'The phenomenal international bestseller on human behavior by Nobel laureate Daniel Kahneman that explains the two systems that drive the way we think: System 1 is fast, intuitive, and emotional; System 2 is slower, more deliberative, and more logical.',
            'language': 'English',
            'publication_year': 2011,
            'page_count': 512,
            'reading_duration': 'Long',
            'min_age': 16,
            'max_age': 99,
            'rating': 4.6,
            'cover_class': 'thinking',
            'cover_title': 'THINKING<br>FAST & SLOW',
            'cover_gradient': 'linear-gradient(135deg, #2E1A47 0%, #4A2E75 100%)',
            'is_featured': True,
            'genres': ['Psychology', 'Self-Help']
        },
        {
            'title': 'The Silent Patient',
            'author': 'Alex Michaelides',
            'isbn': '9781250301696',
            'description': 'A shocking psychological thriller of a woman\'s act of violence against her husband—and of the therapist obsessed with uncovering her motive.',
            'language': 'English',
            'publication_year': 2019,
            'page_count': 336,
            'reading_duration': 'Medium',
            'min_age': 15,
            'max_age': 99,
            'rating': 4.7,
            'cover_class': 'silent',
            'cover_title': 'THE SILENT<br>PATIENT',
            'cover_gradient': 'linear-gradient(135deg, #4A0E17 0%, #7A1C2B 100%)',
            'is_featured': False,
            'genres': ['Thriller', 'Psychology']
        },
        {
            'title': '1984',
            'author': 'George Orwell',
            'isbn': '9780451524935',
            'description': 'The classic dystopian masterpiece about totalitarian surveillance, propaganda, and the struggle for human liberty in a world governed by Big Brother.',
            'language': 'English',
            'publication_year': 1949,
            'page_count': 328,
            'reading_duration': 'Medium',
            'min_age': 13,
            'max_age': 99,
            'rating': 4.9,
            'cover_class': 'hailmary',
            'cover_title': '1984',
            'cover_gradient': 'linear-gradient(135deg, #881337 0%, #9F1239 100%)',
            'is_featured': False,
            'genres': ['Fiction', 'Science Fiction']
        },
        {
            'title': 'Educated',
            'author': 'Tara Westover',
            'isbn': '9780399590504',
            'description': 'An unforgettable memoir of resilience, fierce determination, and the struggle for self-invention through learning.',
            'language': 'English',
            'publication_year': 2018,
            'page_count': 352,
            'reading_duration': 'Medium',
            'min_age': 14,
            'max_age': 99,
            'rating': 4.9,
            'cover_class': 'alchemist',
            'cover_title': 'EDUCATED',
            'cover_gradient': 'linear-gradient(135deg, #004D40 0%, #00695C 100%)',
            'is_featured': False,
            'genres': ['Biography']
        },
        {
            'title': 'Deep Work',
            'author': 'Cal Newport',
            'isbn': '9781455586691',
            'description': 'Rules for focused success in a distracted world. An indispensable blueprint for producing elite cognitive work and mastering hard things quickly in the digital age.',
            'language': 'English',
            'publication_year': 2016,
            'page_count': 304,
            'reading_duration': 'Medium',
            'min_age': 15,
            'max_age': 99,
            'rating': 4.9,
            'cover_class': 'clean',
            'cover_title': 'DEEP<br>WORK',
            'cover_gradient': 'linear-gradient(135deg, #1E3A8A 0%, #172554 100%)',
            'is_featured': False,
            'genres': ['Technology', 'Self-Help']
        },
        {
            'title': 'Pride and Prejudice',
            'author': 'Jane Austen',
            'isbn': '9780141439518',
            'description': 'Brilliant prose and timeless characters. Elizabeth Bennet and Mr. Darcy navigate pride, misunderstanding, and societal expectations in Regency England.',
            'language': 'English',
            'publication_year': 1813,
            'page_count': 432,
            'reading_duration': 'Medium',
            'min_age': 12,
            'max_age': 99,
            'rating': 4.8,
            'cover_class': 'alchemist',
            'cover_title': 'PRIDE &<br>PREJUDICE',
            'cover_gradient': 'linear-gradient(135deg, #831843 0%, #9D174D 100%)',
            'is_featured': False,
            'genres': ['Romance', 'Fiction']
        },
        {
            'title': 'Sapiens: A Brief History of Humankind',
            'author': 'Yuval Noah Harari',
            'isbn': '9780062316097',
            'description': 'A bold narrative that challenges everything we knew about being human: our origins, our ideas, our actions, our power... and our future.',
            'language': 'English',
            'publication_year': 2014,
            'page_count': 443,
            'reading_duration': 'Medium',
            'min_age': 14,
            'max_age': 99,
            'rating': 4.8,
            'cover_class': 'atomic',
            'cover_title': 'SAPIENS',
            'is_featured': True,
            'genres': ['History', 'Psychology']
        }
    ]

    book_map = {}
    for b_dict in books_data:
        b = Book.query.filter_by(title=b_dict['title']).first()
        if not b:
            b = Book(
                title=b_dict['title'],
                author=b_dict['author'],
                isbn=b_dict['isbn'],
                description=b_dict['description'],
                language=b_dict['language'],
                publication_year=b_dict['publication_year'],
                page_count=b_dict['page_count'],
                reading_duration=b_dict['reading_duration'],
                min_age=b_dict['min_age'],
                max_age=b_dict['max_age'],
                rating=b_dict['rating'],
                cover_class=b_dict.get('cover_class', 'atomic'),
                cover_title=b_dict.get('cover_title', b_dict['title']),
                cover_gradient=b_dict.get('cover_gradient', ''),
                is_featured=b_dict.get('is_featured', False)
            )
            for g_name in b_dict['genres']:
                if g_name in genre_map:
                    b.genres.append(genre_map[g_name])
            db.session.add(b)
            db.session.flush()
        book_map[b_dict['title']] = b

    db.session.commit()
    return genre_map, book_map


def seed_demo_user(genre_map=None, book_map=None):
    """
    Seeds initial demonstration account: Krushna Patel (krushna.patel@example.com)
    Only invoked in development or when explicitly enabled via SEED_DEMO_DATA=true.
    """
    demo_user = User.query.filter_by(email='krushna.patel@example.com').first()
    if not demo_user:
        if not genre_map or not book_map:
            genre_map, book_map = seed_system_catalog()

        demo_user = User(
            username='krushna_patel',
            email='krushna.patel@example.com',
            full_name='Krushna Patel',
            phone='+1 (555) 389-2041',
            date_of_birth=date(1998, 6, 14),
            preferred_language='English',
            role='user',
            profile_image='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
            email_notifications=True,
            reading_reminders=True,
            created_at=datetime(2025, 1, 15, 10, 0, 0)
        )
        demo_user.set_password('password123')
        db.session.add(demo_user)
        db.session.flush()

        # Seed UserPreferences
        pref = UserPreferences(
            user_id=demo_user.id,
            preferred_language='English',
            age_group='Adult',
            reading_duration='Any',
            reading_goal=30,
            interests='Avid reader exploring behavioral psychology, technological craftsmanship, and speculative fiction. Currently pursuing a 24-books-a-year reading challenge.'
        )
        pref.preferred_genres = [genre_map['Technology'], genre_map['Self-Help'], genre_map['Science Fiction'], genre_map['Psychology']]
        db.session.add(pref)

        # Seed UserBooks (Shelves)
        # Currently Reading:
        ub1 = UserBook(user_id=demo_user.id, book_id=book_map['Atomic Habits'].id, status='currently-reading', current_page=192, added_at=datetime(2026, 9, 15))
        ub2 = UserBook(user_id=demo_user.id, book_id=book_map['Project Hail Mary'].id, status='currently-reading', current_page=280, added_at=datetime(2026, 9, 18))

        # Want to Read:
        ub3 = UserBook(user_id=demo_user.id, book_id=book_map['The Alchemist'].id, status='want-to-read', current_page=0, added_at=datetime(2026, 9, 20))
        ub4 = UserBook(user_id=demo_user.id, book_id=book_map['Clean Code'].id, status='want-to-read', current_page=0, added_at=datetime(2026, 9, 22))
        ub5 = UserBook(user_id=demo_user.id, book_id=book_map['Dune'].id, status='want-to-read', current_page=0, added_at=datetime(2026, 9, 25))

        # Completed:
        ub6 = UserBook(user_id=demo_user.id, book_id=book_map['The Psychology of Money'].id, status='completed', current_page=256, user_rating=5.0, review='Timeless lessons on wealth, greed, and happiness. A masterclass in understanding personal behavior.', added_at=datetime(2026, 9, 10), completed_at=datetime(2026, 9, 28))
        ub7 = UserBook(user_id=demo_user.id, book_id=book_map['Pride and Prejudice'].id, status='completed', current_page=432, user_rating=4.8, review='Brilliant prose and timeless characters. Elizabeth Bennet and Mr. Darcy remain the golden standard.', added_at=datetime(2026, 9, 1), completed_at=datetime(2026, 9, 12))
        ub8 = UserBook(user_id=demo_user.id, book_id=book_map['Deep Work'].id, status='completed', current_page=304, user_rating=4.9, review='Rules for focused success in a distracted world. An indispensable blueprint for cognitive output.', added_at=datetime(2026, 8, 5), completed_at=datetime(2026, 8, 20))

        db.session.add_all([ub1, ub2, ub3, ub4, ub5, ub6, ub7, ub8])

        # Seed Wishlist
        wl1 = WishlistItem(user_id=demo_user.id, book_id=book_map['Thinking, Fast and Slow'].id, added_at=datetime(2026, 9, 28))
        wl2 = WishlistItem(user_id=demo_user.id, book_id=book_map['The Silent Patient'].id, added_at=datetime(2026, 9, 27))
        wl3 = WishlistItem(user_id=demo_user.id, book_id=book_map['1984'].id, added_at=datetime(2026, 9, 25))
        wl4 = WishlistItem(user_id=demo_user.id, book_id=book_map['Educated'].id, added_at=datetime(2026, 9, 22))

        db.session.add_all([wl1, wl2, wl3, wl4])

        # Seed Reading History Events
        rh1 = ReadingHistory(user_id=demo_user.id, book_id=book_map['The Psychology of Money'].id, action='completed', details='Completed 256 pages and submitted review.', created_at=datetime(2026, 9, 28, 18, 30))
        rh2 = ReadingHistory(user_id=demo_user.id, book_id=book_map['Pride and Prejudice'].id, action='completed', details='Completed 432 pages with 5-star rating.', created_at=datetime(2026, 9, 12, 20, 15))
        rh3 = ReadingHistory(user_id=demo_user.id, book_id=book_map['Deep Work'].id, action='completed', details='Finished book and applied focus strategies.', created_at=datetime(2026, 8, 20, 16, 45))
        rh4 = ReadingHistory(user_id=demo_user.id, book_id=book_map['Atomic Habits'].id, action='updated_progress', details='Read to page 192 of 320.', created_at=datetime(2026, 9, 29, 21, 0))
        rh5 = ReadingHistory(user_id=demo_user.id, book_id=book_map['Project Hail Mary'].id, action='started', details='Started reading Chapter 1.', created_at=datetime(2026, 9, 18, 14, 0))

        db.session.add_all([rh1, rh2, rh3, rh4, rh5])
        db.session.commit()


def seed_database(app):
    """
    Main database seeder entrypoint called during application initialization.
    """
    with app.app_context():
        db.create_all()
        genre_map, book_map = seed_system_catalog()

        # Check environment if demo user should be seeded
        seed_demo = os.environ.get('SEED_DEMO_DATA', 'true').lower() in ('true', '1')
        if seed_demo:
            seed_demo_user(genre_map, book_map)
