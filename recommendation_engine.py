"""
SmartBook — Deterministic Rule-Based Recommendation Engine
Evaluates candidate books against user preferences using exact scoring rules and returns ranked results with natural language explanations.
"""

from datetime import date
import re


def calculate_age(dob):
    if not dob:
        return 26  # Default adult age
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def evaluate_book_recommendation(book, user, rules_weights=None):
    """
    Evaluates a single candidate book for a user.
    Returns (total_score, breakdown_dict, natural_language_explanation).
    """
    weights = {
        'genre': 40,
        'language': 20,
        'age': 15,
        'duration': 15,
        'interest': 10
    }
    if rules_weights:
        weights.update(rules_weights)

    user_pref = user.preference
    preferred_genres = [g.name.lower() for g in user_pref.preferred_genres] if user_pref and user_pref.preferred_genres else ['technology', 'self-help', 'science fiction']
    preferred_language = (user.preferred_language or 'English').strip().lower()
    user_age = calculate_age(user.date_of_birth) if user.date_of_birth else 26
    pref_duration = (user_pref.reading_duration or 'Any') if user_pref else 'Any'
    pref_interests = (user_pref.interests or '') if user_pref else ''

    breakdown = {}
    explanations = []

    # 1. Genre Score (Max 40 pts)
    book_genres_names = [g.name.lower() for g in book.genres]
    if book_genres_names:
        matching_genres = [g for g in book_genres_names if g in preferred_genres]
        overlap_ratio = len(matching_genres) / len(book_genres_names)
        genre_score = round(overlap_ratio * weights['genre'], 1)
        if matching_genres:
            explanations.append(f"Matches your interest in {', '.join(g.title() for g in matching_genres)}")
    else:
        genre_score = 0.0
    breakdown['genre'] = genre_score

    # 2. Language Score (Max 20 pts)
    book_lang = (book.language or 'English').strip().lower()
    if book_lang == preferred_language:
        lang_score = float(weights['language'])
        explanations.append(f"Available in your preferred language ({book.language})")
    else:
        lang_score = 0.0
    breakdown['language'] = lang_score

    # 3. Age Appropriateness (Max 15 pts)
    if book.min_age <= user_age <= book.max_age:
        age_score = float(weights['age'])
    else:
        age_score = 0.0
    breakdown['age'] = age_score

    # 4. Reading Duration (Max 15 pts)
    if pref_duration.lower() == 'any' or pref_duration.lower() == book.reading_duration.lower():
        dur_score = float(weights['duration'])
        if pref_duration.lower() != 'any':
            explanations.append(f"Matches your {book.reading_duration.lower()} read preference ({book.page_count} pages)")
    else:
        dur_score = 0.0
    breakdown['duration'] = dur_score

    # 5. Interest Keywords (Max 10 pts)
    interest_score = 0.0
    if pref_interests:
        interest_tokens = [w.lower() for w in re.findall(r'\b\w{4,}\b', pref_interests)]
        book_corpus = f"{book.title} {book.author} {book.description} {' '.join(book_genres_names)}".lower()
        matched_tokens = [token for token in interest_tokens if token in book_corpus]
        if matched_tokens:
            ratio = min(1.0, len(set(matched_tokens)) / max(1, min(len(interest_tokens), 4)))
            interest_score = round(ratio * weights['interest'], 1)
            explanations.append(f"Aligns with your profile keywords ({', '.join(set(matched_tokens[:3]))})")
    breakdown['interest'] = interest_score

    total_score = min(100.0, sum(breakdown.values()))
    reason = " · ".join(explanations) if explanations else "Curated based on high editorial rating and universal reader acclaim."

    return {
        'score': round(total_score),
        'breakdown': breakdown,
        'reason': reason
    }


def get_recommendations_for_user(user, all_books, limit=6):
    """
    Ranks books for the user based on multi-tier deterministic sorting:
    1. Score descending
    2. Rating descending
    3. Publication year descending
    4. Title ascending
    """
    scored = []
    for b in all_books:
        eval_res = evaluate_book_recommendation(b, user)
        scored.append({
            'book': b,
            'score': eval_res['score'],
            'breakdown': eval_res['breakdown'],
            'reason': eval_res['reason']
        })

    scored.sort(key=lambda item: (
        -item['score'],
        -item['book'].rating,
        -item['book'].publication_year,
        item['book'].title
    ))

    return scored[:limit]
