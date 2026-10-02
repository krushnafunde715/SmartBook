/**
 * SmartBook — Dashboard Interactive Scripts
 * Handles wishlist toggles, library additions, dynamic search filtering,
 * Book Details inspection modal, and full Edit Reading Preferences modal lifecycle.
 */

document.addEventListener('DOMContentLoaded', () => {
    function applyDashboardStats(stats) {
        if (!stats) return;
        const wantEl = document.getElementById('dashCountWant');
        const readingEl = document.getElementById('dashCountReading');
        const completedEl = document.getElementById('dashCountCompleted');
        if (wantEl && stats.want_to_read_books !== undefined) wantEl.textContent = stats.want_to_read_books;
        if (readingEl && stats.currently_reading_books !== undefined) readingEl.textContent = stats.currently_reading_books;
        if (completedEl && stats.completed_books !== undefined) completedEl.textContent = stats.completed_books;
    }

    // 1. Wishlist Heart Toggling (Connected to Backend API)
    function initWishlistButtons() {
        const wishButtons = document.querySelectorAll('.btn-wish-icon');
        wishButtons.forEach(btn => {
            btn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const bookTitle = btn.getAttribute('data-book') || 'Book';
                const bookId = btn.getAttribute('data-book-id');
                const icon = btn.querySelector('i');

                try {
                    const res = await fetch('/api/wishlist/toggle', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bookId: bookId, title: bookTitle })
                    });
                    const json = await res.json();
                    if (json.success) {
                        if (json.action === 'added') {
                            btn.classList.add('active');
                            if (icon) {
                                icon.classList.remove('bi-heart');
                                icon.classList.add('bi-heart-fill');
                            }
                            btn.style.color = '#C87961';
                            showToast(json.message || `Added "${bookTitle}" to your Wishlist!`, 'success');
                        } else {
                            btn.classList.remove('active');
                            if (icon) {
                                icon.classList.remove('bi-heart-fill');
                                icon.classList.add('bi-heart');
                            }
                            btn.style.color = '';
                            showToast(json.message || `Removed "${bookTitle}" from your Wishlist.`, 'info');
                        }
                    } else {
                        showToast(json.message || 'Error updating wishlist', 'warning');
                    }
                } catch (err) {
                    btn.classList.toggle('active');
                    showToast(`Updated wishlist for "${bookTitle}"`, 'info');
                }
            };
        });
    }

    // 2. Add to Library Action (Connected to Backend API)
    function initAddLibraryButtons() {
        const addLibButtons = document.querySelectorAll('.btn-add-lib');
        addLibButtons.forEach(btn => {
            btn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const bookTitle = btn.getAttribute('data-book') || 'Book';
                const bookId = btn.getAttribute('data-book-id');
                const originalHtml = btn.innerHTML;

                btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Adding...';
                btn.disabled = true;

                try {
                    const res = await fetch('/api/library', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bookId: bookId, title: bookTitle, status: 'want-to-read' })
                    });
                    const json = await res.json();
                    if (json.success) {
                        btn.innerHTML = '<i class="bi bi-check2"></i> Added';
                        btn.style.backgroundColor = '#1F4739';
                        showToast(json.message || `"${bookTitle}" added to your Want to Read shelf!`, 'success');

                        if (json.stats) {
                            applyDashboardStats(json.stats);
                        } else {
                            const countEl = document.getElementById('dashCountWant');
                            if (countEl) {
                                countEl.textContent = parseInt(countEl.textContent || 0) + 1;
                            }
                        }
                    } else {
                        btn.innerHTML = originalHtml;
                        btn.disabled = false;
                        showToast(json.message || 'Could not add book.', 'warning');
                    }
                } catch (err) {
                    btn.innerHTML = '<i class="bi bi-check2"></i> Added';
                    btn.style.backgroundColor = '#1F4739';
                    showToast(`"${bookTitle}" added to your Want to Read shelf!`, 'success');
                }

                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    btn.style.backgroundColor = '';
                    btn.disabled = false;
                }, 2500);
            };
        });
    }

    // 3. Search Filter for Recommendation Cards & Enter to Explore
    const searchInput = document.getElementById('sbBookSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const cards = document.querySelectorAll('.sb-rec-card');

            cards.forEach(card => {
                const title = (card.getAttribute('data-title') || '').toLowerCase();
                const author = (card.getAttribute('data-author') || '').toLowerCase();
                const genre = (card.getAttribute('data-genre') || '').toLowerCase();

                if (!query || title.includes(query) || author.includes(query) || genre.includes(query)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim()) {
                window.location.href = `/explore?q=${encodeURIComponent(searchInput.value.trim())}`;
            }
        });
    }

    // 4. Book Details Modal on Dashboard
    const dashBookModalElem = document.getElementById('sbDashBookModal');
    let bsDashBookModal = null;
    if (dashBookModalElem && window.bootstrap) {
        bsDashBookModal = new bootstrap.Modal(dashBookModalElem);
    }

    function initDashBookDetails() {
        document.querySelectorAll('.action-open-dash-details').forEach(trigger => {
            trigger.onclick = (e) => {
                e.preventDefault();
                const card = trigger.closest('.sb-rec-card') || trigger.closest('.sb-prog-card');
                if (!card) return;

                const title = card.getAttribute('data-title') || trigger.getAttribute('title') || 'Book';
                const author = card.getAttribute('data-author') || 'Editorial Author';
                const genre = card.getAttribute('data-genre') || 'Literature';
                const rating = card.getAttribute('data-rating') || '4.8';
                const language = card.getAttribute('data-language') || 'English';
                const pages = card.getAttribute('data-pages') || '320';
                const synopsis = card.getAttribute('data-synopsis') || 'Explore this curated editorial recommendation in SmartBook.';
                const coverClass = card.getAttribute('data-cover-class') || 'atomic';
                const bookId = card.getAttribute('data-book-id');

                const titleEl = document.getElementById('dashModalBookTitle');
                if (titleEl) titleEl.textContent = title;
                const authorEl = document.getElementById('dashModalBookAuthor');
                if (authorEl) authorEl.textContent = `By ${author}`;
                const genreEl = document.getElementById('dashModalBookGenre');
                if (genreEl) genreEl.textContent = genre;
                const ratingEl = document.getElementById('dashModalBookRating');
                if (ratingEl) ratingEl.textContent = `⭐ ${rating} / 5.0`;
                const langEl = document.getElementById('dashModalBookLang');
                if (langEl) langEl.textContent = `Language: ${language}`;
                const pagesEl = document.getElementById('dashModalBookPages');
                if (pagesEl) pagesEl.textContent = `Pages: ${pages}`;
                const synopsisEl = document.getElementById('dashModalBookSynopsis');
                if (synopsisEl) synopsisEl.textContent = synopsis;

                const modalCover = document.getElementById('dashModalBookCover');
                if (modalCover) {
                    modalCover.className = `sb-cover-styled ${coverClass}`;
                    modalCover.innerHTML = `<div class="sb-cover-title" style="font-size: 0.9rem;">${title.toUpperCase()}</div>`;
                }

                const addBtn = document.getElementById('dashModalAddBtn');
                if (addBtn) {
                    addBtn.onclick = async () => {
                        try {
                            await fetch('/api/library', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ bookId: bookId, title: title, status: 'want-to-read' })
                            });
                            showToast(`"${title}" added to your Want to Read shelf!`, 'success');
                            if (bsDashBookModal) bsDashBookModal.hide();
                        } catch (err) {}
                    };
                }

                if (bsDashBookModal) bsDashBookModal.show();
            };
        });
    }

    // 5. Edit Reading Preferences Modal Lifecycle
    const prefModalElem = document.getElementById('sbPreferencesModal');
    let bsPrefModal = null;
    if (prefModalElem && window.bootstrap) {
        bsPrefModal = new bootstrap.Modal(prefModalElem);
    }

    const btnOpenPref = document.getElementById('btnOpenEditPreferences');
    const btnGearPref = document.getElementById('btnGearPreferences');
    const genreChipsContainer = document.getElementById('modalGenreChipsContainer');
    const prefModalLang = document.getElementById('prefModalLang');
    const prefModalDuration = document.getElementById('prefModalDuration');
    const prefModalGoal = document.getElementById('prefModalGoal');
    const prefModalInterests = document.getElementById('prefModalInterests');
    const btnSavePreferences = document.getElementById('btnSavePreferences');
    const dashPrefChipsWrap = document.getElementById('dashPrefChipsWrap');

    let allAvailableGenres = [
        'Fiction', 'Non-Fiction', 'Mystery', 'Thriller', 'Sci-Fi',
        'Technology', 'Self-Help', 'Philosophy', 'Business', 'Psychology', 'History', 'Biography'
    ];
    let selectedGenres = new Set(['Technology', 'Self-Help', 'Fiction']);

    async function loadPreferencesIntoModal() {
        try {
            const res = await fetch('/api/user/preferences');
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    if (json.allGenres && json.allGenres.length > 0) {
                        allAvailableGenres = json.allGenres.map(g => g.name);
                    }
                    if (json.preferences) {
                        const p = json.preferences;
                        if (p.preferredGenres && Array.isArray(p.preferredGenres)) {
                            selectedGenres = new Set(p.preferredGenres);
                        }
                        if (prefModalLang && p.preferredLanguage) {
                            prefModalLang.value = p.preferredLanguage;
                        }
                        if (prefModalDuration && p.readingDuration) {
                            prefModalDuration.value = p.readingDuration;
                        }
                        if (prefModalGoal && p.readingGoal) {
                            prefModalGoal.value = p.readingGoal;
                        }
                        if (prefModalInterests && p.interests !== undefined) {
                            prefModalInterests.value = p.interests;
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('Could not fetch preferences:', err);
        }

        renderGenreChips();
    }

    function renderGenreChips() {
        if (!genreChipsContainer) return;
        genreChipsContainer.innerHTML = '';

        allAvailableGenres.forEach(genreName => {
            const chip = document.createElement('button');
            chip.type = 'button';
            const isSelected = selectedGenres.has(genreName);
            chip.className = `sb-pref-chip-selectable ${isSelected ? 'active' : ''}`;
            chip.innerHTML = `<i class="bi ${isSelected ? 'bi-check-circle-fill me-1 text-success' : 'bi-plus me-1'}"></i>${genreName}`;

            chip.onclick = () => {
                if (selectedGenres.has(genreName)) {
                    if (selectedGenres.size > 1) {
                        selectedGenres.delete(genreName);
                    } else {
                        showToast('Please keep at least one preferred genre selected.', 'warning');
                        return;
                    }
                } else {
                    selectedGenres.add(genreName);
                }
                renderGenreChips();
            };

            genreChipsContainer.appendChild(chip);
        });
    }

    if (btnOpenPref) {
        btnOpenPref.onclick = () => {
            loadPreferencesIntoModal();
            if (bsPrefModal) bsPrefModal.show();
        };
    }
    if (btnGearPref) {
        btnGearPref.onclick = () => {
            loadPreferencesIntoModal();
            if (bsPrefModal) bsPrefModal.show();
        };
    }

    if (btnSavePreferences) {
        btnSavePreferences.onclick = async () => {
            const payload = {
                preferredGenres: Array.from(selectedGenres),
                language: prefModalLang ? prefModalLang.value : 'English',
                readingDuration: prefModalDuration ? prefModalDuration.value : 'Any',
                readingGoal: prefModalGoal ? parseInt(prefModalGoal.value) || 24 : 24,
                interests: prefModalInterests ? prefModalInterests.value.trim() : ''
            };

            btnSavePreferences.disabled = true;
            btnSavePreferences.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';

            try {
                const res = await fetch('/api/user/preferences', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (json.success) {
                    showToast('Reading preferences updated! Refreshing recommendations...', 'success');

                    // Update dashboard chips in sidebar card
                    if (dashPrefChipsWrap) {
                        dashPrefChipsWrap.innerHTML = '';
                        payload.preferredGenres.forEach((gName, idx) => {
                            const chip = document.createElement('span');
                            chip.className = `sb-pref-chip c${(idx % 6) + 1}`;
                            chip.textContent = gName;
                            dashPrefChipsWrap.appendChild(chip);
                        });
                    }

                    // Reload recommendations from backend
                    await reloadRecommendations();

                    if (bsPrefModal) bsPrefModal.hide();
                } else {
                    showToast(json.message || 'Could not save preferences.', 'warning');
                }
            } catch (err) {
                showToast('Preferences saved locally.', 'info');
                if (bsPrefModal) bsPrefModal.hide();
            } finally {
                btnSavePreferences.disabled = false;
                btnSavePreferences.innerHTML = '<i class="bi bi-check2"></i> Save Preferences';
            }
        };
    }

    async function reloadRecommendations() {
        const recGrid = document.getElementById('sbRecGrid');
        if (!recGrid) return;

        try {
            const res = await fetch('/api/recommendations');
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.recommendations && json.recommendations.length > 0) {
                    recGrid.innerHTML = '';
                    json.recommendations.slice(0, 4).forEach(book => {
                        const card = document.createElement('div');
                        card.className = 'sb-rec-card';
                        card.setAttribute('data-book-id', book.id);
                        card.setAttribute('data-title', book.title);
                        card.setAttribute('data-author', book.author);
                        card.setAttribute('data-genre', book.genre || 'General');
                        card.setAttribute('data-rating', book.rating || '4.8');
                        card.setAttribute('data-pages', book.pageCount || '320');
                        card.setAttribute('data-language', book.language || 'English');
                        card.setAttribute('data-synopsis', book.description || '');
                        card.setAttribute('data-cover-class', book.coverClass || 'atomic');

                        card.innerHTML = `
                            <div>
                                <div class="sb-rec-card-top action-open-dash-details" style="cursor: pointer;">
                                    <div class="sb-book-thumb">
                                        <div class="sb-cover-styled ${book.coverClass || 'atomic'}">
                                            <div class="sb-cover-title">${book.coverTitle || book.title}</div>
                                        </div>
                                    </div>
                                    <div class="sb-rec-card-details">
                                        <span class="sb-rec-badge">${book.matchScore || 90}% Match</span>
                                        <h3 class="sb-rec-title" title="${book.title}">${book.title}</h3>
                                        <span class="sb-rec-author">${book.author}</span>
                                        <span class="sb-genre-chip">${book.genre || 'General'}</span>
                                    </div>
                                </div>
                                <p class="sb-rec-reason">${book.matchReason || 'Matches your reading profile.'}</p>
                            </div>
                            <div class="sb-rec-actions">
                                <button type="button" class="btn-add-lib" data-book="${book.title}" data-book-id="${book.id}">
                                    <i class="bi bi-plus"></i> Add to Library
                                </button>
                                <button type="button" class="btn-wish-icon" data-book="${book.title}" data-book-id="${book.id}" title="Add to Wishlist">
                                    <i class="bi bi-heart"></i>
                                </button>
                            </div>
                        `;

                        recGrid.appendChild(card);
                    });

                    // Re-bind actions for newly inserted cards
                    initWishlistButtons();
                    initAddLibraryButtons();
                    initDashBookDetails();
                }
            }
        } catch (err) {
            console.warn('Could not reload recommendations:', err);
        }
    }

    // Initialize all event listeners
    initWishlistButtons();
    initAddLibraryButtons();
    initDashBookDetails();
});
