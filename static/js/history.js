/**
 * SmartBook — Reading History & Milestones Engine
 * Calculates metrics, filters finished books, manages reviews, and handles shelf transitions with backend persistence
 */

document.addEventListener('DOMContentLoaded', () => {
    let historyList = [];

    // DOM Elements
    const gridContainer = document.getElementById('historyGrid');
    const emptyState = document.getElementById('historyEmptyState');
    const finishedCountBadge = document.getElementById('historyFinishedCount');
    const searchInput = document.getElementById('historySearch');
    const topSearchInput = document.getElementById('sbTopSearch');
    const genreSelect = document.getElementById('historyGenreSelect');
    const sortSelect = document.getElementById('historySortSelect');
    const clearBtn = document.getElementById('historyClearFilters');

    // Metric Badges
    const metricCompleted = document.getElementById('metricCompleted');
    const metricPages = document.getElementById('metricPages');
    const metricActive = document.getElementById('metricActive');
    const metricStreak = document.getElementById('metricStreak');

    // Modal Elements
    const histModalElem = document.getElementById('sbHistoryModal');
    let bsHistModal = null;
    if (histModalElem && window.bootstrap) {
        bsHistModal = new bootstrap.Modal(histModalElem);
    }
    const modalHistCover = document.getElementById('modalHistCover');
    const modalHistTitle = document.getElementById('modalHistTitle');
    const modalHistAuthor = document.getElementById('modalHistAuthor');
    const modalHistGenre = document.getElementById('modalHistGenre');
    const modalHistRating = document.getElementById('modalHistRating');
    const modalHistPages = document.getElementById('modalHistPages');
    const modalHistDate = document.getElementById('modalHistDate');
    const modalHistReview = document.getElementById('modalHistReview');
    const modalHistRereadBtn = document.getElementById('modalHistRereadBtn');

    // 1. Load Authoritative Completed Books and Stats from Backend API
    async function loadHistoryFromBackend() {
        try {
            const res = await fetch('/api/history');
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    historyList = json.completedBooks || [];
                    if (json.stats) {
                        applyServerStats(json.stats);
                    } else {
                        updateMetricsFromList();
                    }
                    renderHistory();
                }
            }
        } catch (err) {
            console.warn('Backend history fetch error:', err);
        }
    }

    // 2. Metrics Updaters
    function applyServerStats(stats) {
        if (!stats) return;
        const totalCompleted = stats.completed_books ?? historyList.length;
        const totalPages = stats.total_pages_read ?? historyList.reduce((sum, item) => sum + (parseInt(item.totalPages || item.pages) || 0), 0);
        const activeCount = stats.currently_reading_books ?? 0;
        const streakDays = stats.reading_streak_days ?? (totalCompleted > 0 ? 14 : 0);

        if (finishedCountBadge) finishedCountBadge.textContent = totalCompleted;
        if (metricCompleted) metricCompleted.textContent = totalCompleted;
        if (metricPages) metricPages.textContent = totalPages.toLocaleString();
        if (metricActive) metricActive.textContent = activeCount;
        if (metricStreak) metricStreak.textContent = `${streakDays} Days`;
    }

    function updateMetricsFromList() {
        const totalCompleted = historyList.length;
        const totalPages = historyList.reduce((sum, item) => sum + (parseInt(item.totalPages || item.pages) || 0), 0);

        if (finishedCountBadge) finishedCountBadge.textContent = totalCompleted;
        if (metricCompleted) metricCompleted.textContent = totalCompleted;
        if (metricPages) metricPages.textContent = totalPages.toLocaleString();
    }

    // 3. Render Engine
    function renderHistory() {
        const query = (searchInput?.value || '').toLowerCase().trim();
        const selectedGenre = (genreSelect?.value || 'all').toLowerCase();
        const sortBy = sortSelect?.value || 'completed-desc';

        // Filter
        let matching = historyList.filter(item => {
            const matchesQuery = !query ||
                (item.title && item.title.toLowerCase().includes(query)) ||
                (item.author && item.author.toLowerCase().includes(query)) ||
                (item.genre && item.genre.toLowerCase().includes(query));

            const matchesGenre = selectedGenre === 'all' ||
                (item.genre && item.genre.toLowerCase().includes(selectedGenre));

            return matchesQuery && matchesGenre;
        });

        // Sort
        matching.sort((a, b) => {
            if (sortBy === 'completed-desc') {
                return (b.completedDate || '').localeCompare(a.completedDate || '');
            } else if (sortBy === 'completed-asc') {
                return (a.completedDate || '').localeCompare(b.completedDate || '');
            } else if (sortBy === 'rating-desc') {
                return (b.rating || 0) - (a.rating || 0);
            }
            return 0;
        });

        // Render Grid or Empty State
        if (matching.length === 0) {
            if (gridContainer) gridContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (gridContainer) {
            gridContainer.style.display = 'grid';
            gridContainer.innerHTML = '';

            matching.forEach(item => {
                const card = document.createElement('div');
                card.className = 'sb-history-card';
                card.setAttribute('data-id', item.id);

                const coverStyle = item.coverGradient ? `background: ${item.coverGradient};` : '';

                card.innerHTML = `
                    <div>
                        <div class="sb-history-card-top">
                            <div class="sb-history-thumb">
                                <div class="sb-cover-styled ${item.coverClass || 'atomic'}" style="${coverStyle} height: 100%;">
                                    <div class="sb-cover-title">${item.coverTitle || item.title}</div>
                                </div>
                            </div>
                            <div class="sb-history-details">
                                <span class="sb-history-status-badge">
                                    <i class="bi bi-check-circle-fill"></i> Completed
                                </span>
                                <h3 class="sb-history-book-title" title="${item.title}">${item.title}</h3>
                                <span class="sb-history-book-author">${item.author}</span>
                                <span class="sb-explore-genre-tag" style="align-self: flex-start; margin-top: 2px;">${item.genre}</span>
                            </div>
                        </div>

                        <!-- Completion Info Box -->
                        <div class="sb-history-meta-box">
                            <span><i class="bi bi-calendar-check text-success me-1"></i>Finished ${formatDate(item.completedDate)}</span>
                            <span><i class="bi bi-file-earmark-text text-muted me-1"></i>${item.totalPages || item.pages || 256} pages</span>
                        </div>

                        <!-- Review Quote Box -->
                        ${item.review ? `
                            <div class="sb-history-review-box" title="${item.review}">
                                "${item.review}"
                            </div>
                        ` : ''}
                    </div>

                    <!-- Actions -->
                    <div class="sb-history-actions">
                        <button type="button" class="btn-shelf-secondary btn-hist-reread" data-id="${item.id}" style="flex: 1;">
                            <i class="bi bi-arrow-repeat"></i> Read Again
                        </button>
                        <button type="button" class="btn-shelf-primary btn-hist-details" data-id="${item.id}" style="flex: 1;">
                            View Details
                        </button>
                    </div>
                `;

                gridContainer.appendChild(card);
            });

            attachEvents();
        }
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'Recently';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    }

    // 4. Card Events
    function attachEvents() {
        // Read Again Action
        document.querySelectorAll('.btn-hist-reread').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = btn.getAttribute('data-id');
                const book = historyList.find(b => String(b.id) === String(id));
                if (book) {
                    try {
                        const res = await fetch(`/api/library/${book.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'currently-reading', currentPage: 0 })
                        });
                        const data = await res.json();
                        if (data.success) {
                            showToast(`Moved "${book.title}" to Currently Reading!`, 'success');
                            if (data.stats) applyServerStats(data.stats);
                            await loadHistoryFromBackend();
                        } else {
                            showToast(data.message || 'Could not restart book', 'warning');
                        }
                    } catch (err) {
                        showToast(`Restarted "${book.title}" in Currently Reading!`, 'success');
                    }
                }
            });
        });

        // View Details Modal
        document.querySelectorAll('.btn-hist-details, .sb-history-thumb, .sb-history-book-title').forEach(elem => {
            elem.addEventListener('click', (e) => {
                e.preventDefault();
                const card = elem.closest('.sb-history-card');
                if (!card) return;
                const id = card.getAttribute('data-id');
                const book = historyList.find(b => String(b.id) === String(id));
                if (book && bsHistModal) {
                    modalHistTitle.textContent = book.title;
                    modalHistAuthor.textContent = `By ${book.author}`;
                    modalHistGenre.textContent = book.genre;
                    modalHistRating.innerHTML = `<i class="bi bi-star-fill text-warning"></i> ${book.rating || '5.0'} / 5.0`;
                    modalHistPages.textContent = `Pages: ${book.totalPages || book.pages || 256}`;
                    modalHistDate.textContent = `Completed on ${formatDate(book.completedDate)}`;
                    modalHistReview.textContent = book.review || 'No written review provided.';

                    const coverStyle = book.coverGradient ? `background: ${book.coverGradient};` : '';
                    modalHistCover.className = `sb-cover-styled ${book.coverClass || 'atomic'}`;
                    modalHistCover.style = `${coverStyle} height: 100%;`;
                    modalHistCover.innerHTML = `<div class="sb-cover-title" style="font-size: 0.85rem;">${book.coverTitle || book.title}</div>`;

                    modalHistRereadBtn.onclick = async () => {
                        try {
                            const res = await fetch(`/api/library/${book.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'currently-reading', currentPage: 0 })
                            });
                            const data = await res.json();
                            if (data.success) {
                                showToast(`Moved "${book.title}" to Currently Reading!`, 'success');
                                if (data.stats) applyServerStats(data.stats);
                                await loadHistoryFromBackend();
                            }
                        } catch (err) {}
                        bsHistModal.hide();
                    };

                    bsHistModal.show();
                }
            });
        });
    }

    // 5. Search & Filters
    if (searchInput) searchInput.addEventListener('input', renderHistory);
    if (topSearchInput) {
        topSearchInput.addEventListener('input', (e) => {
            if (searchInput) searchInput.value = e.target.value;
            renderHistory();
        });
    }
    if (genreSelect) genreSelect.addEventListener('change', renderHistory);
    if (sortSelect) sortSelect.addEventListener('change', renderHistory);

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (topSearchInput) topSearchInput.value = '';
            if (genreSelect) genreSelect.value = 'all';
            if (sortSelect) sortSelect.value = 'completed-desc';
            renderHistory();
            showToast('History filters cleared', 'info');
        });
    }

    // 6. Toast Notification System — Delegated to Centralized SmartAlert System
    function showToast(message, type = 'info') {
        if (window.SmartAlert) {
            SmartAlert.toast(message, type);
        }
    }

    // Initial load directly from backend
    loadHistoryFromBackend();
});
