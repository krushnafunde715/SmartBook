/**
 * SmartBook — Explore Books Interactive Engine
 * Handles searching, genre pills, language filters, sorting, dynamic centering, pagination, modal inspection, and wishlist actions
 */

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('sbExploreSearch');
    const topSearchInput = document.getElementById('sbTopSearch');
    const genreTabs = document.querySelectorAll('.sb-genre-tab');
    const sortSelect = document.getElementById('sbSortSelect');
    const languageSelect = document.getElementById('sbLanguageSelect');
    const clearBtn = document.getElementById('sbClearFilters');
    const cards = Array.from(document.querySelectorAll('.sb-explore-card'));
    const gridContainer = document.getElementById('sbExploreGrid');
    const emptyState = document.getElementById('sbEmptyState');
    const resultsCount = document.getElementById('sbResultsCount');
    const paginationWrap = document.getElementById('sbPaginationWrap');

    const ITEMS_PER_PAGE = 8;
    let currentPage = 1;
    let activeGenre = 'all';

    // 1. Dynamic Catalog Filtering & Pagination Engine
    function updateBookGrid(resetPage = false) {
        if (resetPage) {
            currentPage = 1;
        }

        const query = (searchInput?.value || '').toLowerCase().trim();
        const selectedLang = (languageSelect?.value || 'all').toLowerCase();
        const sortBy = sortSelect?.value || 'rating-desc';

        // Filter matching cards
        let matchingCards = [];

        cards.forEach(card => {
            const title = (card.getAttribute('data-title') || '').toLowerCase();
            const author = (card.getAttribute('data-author') || '').toLowerCase();
            const genre = (card.getAttribute('data-genre') || '').toLowerCase();
            const language = (card.getAttribute('data-language') || '').toLowerCase();

            const matchesGenre = (activeGenre === 'all') || (genre.includes(activeGenre.toLowerCase()));
            const matchesLang = (selectedLang === 'all') || (language.includes(selectedLang));
            const matchesQuery = !query || title.includes(query) || author.includes(query) || genre.includes(query);

            if (matchesGenre && matchesLang && matchesQuery) {
                matchingCards.push(card);
            }
        });

        // Sort matching cards
        matchingCards.sort((a, b) => {
            if (sortBy === 'rating-desc') {
                return parseFloat(b.getAttribute('data-rating') || 0) - parseFloat(a.getAttribute('data-rating') || 0);
            } else if (sortBy === 'title-asc') {
                return (a.getAttribute('data-title') || '').localeCompare(b.getAttribute('data-title') || '');
            } else if (sortBy === 'author-asc') {
                return (a.getAttribute('data-author') || '').localeCompare(b.getAttribute('data-author') || '');
            }
            return 0;
        });

        const totalMatching = matchingCards.length;
        const totalPages = Math.ceil(totalMatching / ITEMS_PER_PAGE);

        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        }
        if (totalPages === 0) {
            currentPage = 1;
        }

        // Calculate page slice
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pagedCards = matchingCards.slice(startIndex, endIndex);

        // Update card visibility in DOM
        cards.forEach(card => {
            if (pagedCards.includes(card)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });

        pagedCards.forEach(card => gridContainer.appendChild(card));

        // Update Results Count Indicator
        if (resultsCount) {
            if (totalMatching === 0) {
                resultsCount.textContent = '0 books found';
            } else if (totalMatching === cards.length) {
                if (totalPages > 1) {
                    resultsCount.textContent = `Showing ${startIndex + 1}–${Math.min(endIndex, totalMatching)} of ${totalMatching} books`;
                } else {
                    resultsCount.textContent = `Showing ${totalMatching} of ${totalMatching} books`;
                }
            } else {
                if (totalPages > 1) {
                    resultsCount.textContent = `Showing ${startIndex + 1}–${Math.min(endIndex, totalMatching)} of ${totalMatching} books (filtered)`;
                } else {
                    resultsCount.textContent = `Showing ${totalMatching} of ${cards.length} books`;
                }
            }
        }

        // Render Empty State or Grid & Pagination
        if (totalMatching === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            if (gridContainer) gridContainer.style.display = 'none';
            if (paginationWrap) paginationWrap.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (gridContainer) gridContainer.style.display = 'grid';
            renderPagination(totalPages);
        }
    }

    // 2. Render Dynamic Pagination Controls
    function renderPagination(totalPages) {
        if (!paginationWrap) return;

        if (totalPages <= 1) {
            paginationWrap.style.display = 'none';
            paginationWrap.innerHTML = '';
            return;
        }

        paginationWrap.style.display = 'flex';
        paginationWrap.innerHTML = '';

        // Previous Button
        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = `sb-page-btn nav-arrow ${currentPage === 1 ? 'disabled' : ''}`;
        prevBtn.setAttribute('aria-label', 'Previous Page');
        prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i> Prev';
        if (currentPage > 1) {
            prevBtn.addEventListener('click', () => {
                currentPage--;
                updateBookGrid(false);
                gridContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        }
        paginationWrap.appendChild(prevBtn);

        // Page Number Buttons
        for (let p = 1; p <= totalPages; p++) {
            const pageBtn = document.createElement('button');
            pageBtn.type = 'button';
            pageBtn.className = `sb-page-btn ${p === currentPage ? 'active' : ''}`;
            pageBtn.textContent = p;
            pageBtn.setAttribute('aria-label', `Page ${p}`);
            if (p !== currentPage) {
                pageBtn.addEventListener('click', () => {
                    currentPage = p;
                    updateBookGrid(false);
                    gridContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });
            }
            paginationWrap.appendChild(pageBtn);
        }

        // Next Button
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = `sb-page-btn nav-arrow ${currentPage === totalPages ? 'disabled' : ''}`;
        nextBtn.setAttribute('aria-label', 'Next Page');
        nextBtn.innerHTML = 'Next <i class="bi bi-chevron-right"></i>';
        if (currentPage < totalPages) {
            nextBtn.addEventListener('click', () => {
                currentPage++;
                updateBookGrid(false);
                gridContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        }
        paginationWrap.appendChild(nextBtn);
    }

    // 3. Genre Tab Event Listeners
    genreTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            genreTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeGenre = tab.getAttribute('data-genre') || 'all';
            updateBookGrid(true); // Return to page 1 on filter change
        });
    });

    // 4. Search, Sort, and Language Listeners
    if (searchInput) {
        searchInput.addEventListener('input', () => updateBookGrid(true));
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', () => updateBookGrid(true));
    }
    if (languageSelect) {
        languageSelect.addEventListener('change', () => updateBookGrid(true));
    }

    // Sync Top Global Search Bar with Catalog Search
    if (topSearchInput) {
        topSearchInput.addEventListener('input', (e) => {
            if (searchInput) {
                searchInput.value = e.target.value;
            }
            updateBookGrid(true);
        });
    }

    // 5. Clear Filters Listener
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (topSearchInput) topSearchInput.value = '';
            if (languageSelect) languageSelect.value = 'all';
            if (sortSelect) sortSelect.value = 'rating-desc';
            genreTabs.forEach(t => t.classList.remove('active'));
            const allTab = document.querySelector('.sb-genre-tab[data-genre="all"]');
            if (allTab) allTab.classList.add('active');
            activeGenre = 'all';
            updateBookGrid(true);
            showToast('Filters cleared', 'info');
        });
    }

    // 6. Wishlist Heart Toggling (Connected to Backend API)
    const wishButtons = document.querySelectorAll('.btn-wish-icon');
    wishButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
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
                if (btn.classList.contains('active')) {
                    if (icon) {
                        icon.classList.remove('bi-heart');
                        icon.classList.add('bi-heart-fill');
                    }
                    btn.style.color = '#C87961';
                    showToast(`Added "${bookTitle}" to your Wishlist!`, 'success');
                } else {
                    if (icon) {
                        icon.classList.remove('bi-heart-fill');
                        icon.classList.add('bi-heart');
                    }
                    btn.style.color = '';
                    showToast(`Removed "${bookTitle}" from your Wishlist.`, 'info');
                }
            }
        });
    });

    // 7. Add to My Books Action (Connected to Backend API)
    const addButtons = document.querySelectorAll('.btn-add-explore');
    addButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const bookTitle = btn.getAttribute('data-book') || 'Book';
            const bookId = btn.getAttribute('data-book-id');
            const card = btn.closest('.sb-explore-card');
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

            // Sync with local cache if needed
            try {
                let stored = localStorage.getItem('sb_my_books_data');
                let myBooks = stored ? JSON.parse(stored) : [];
                const exists = myBooks.some(b => (b.title || '').toLowerCase() === bookTitle.toLowerCase());
                if (!exists && card) {
                    const newBook = {
                        id: 'book-' + Date.now(),
                        title: card.getAttribute('data-title') || bookTitle,
                        author: card.getAttribute('data-author') || 'Unknown Author',
                        genre: card.getAttribute('data-genre') || 'Fiction',
                        status: 'want-to-read',
                        currentPage: 0,
                        totalPages: parseInt(card.getAttribute('data-pages')) || 300,
                        rating: parseFloat(card.getAttribute('data-rating')) || 4.8,
                        coverClass: card.getAttribute('data-cover-class') || 'atomic',
                        coverTitle: card.getAttribute('data-title') || bookTitle,
                        addedDate: new Date().toISOString().split('T')[0]
                    };
                    myBooks.push(newBook);
                    localStorage.setItem('sb_my_books_data', JSON.stringify(myBooks));
                }
            } catch (err) {}

            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.style.backgroundColor = '';
                btn.disabled = false;
            }, 2500);
        });
    });

    // 8. Book Details Modal Inspection
    const detailButtons = document.querySelectorAll('.btn-details-explore, .sb-explore-thumb, .sb-explore-book-title');
    const modalElement = document.getElementById('sbBookModal');
    let bsModal = null;
    if (modalElement && window.bootstrap) {
        bsModal = new bootstrap.Modal(modalElement);
    }

    detailButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const card = btn.closest('.sb-explore-card');
            if (!card) return;

            const title = card.getAttribute('data-title');
            const author = card.getAttribute('data-author');
            const genre = card.getAttribute('data-genre');
            const rating = card.getAttribute('data-rating');
            const language = card.getAttribute('data-language');
            const pages = card.getAttribute('data-pages');
            const synopsis = card.getAttribute('data-synopsis');
            const coverClass = card.getAttribute('data-cover-class');
            const bookId = card.getAttribute('data-book-id');

            // Populate modal
            document.getElementById('modalBookTitle').textContent = title;
            document.getElementById('modalBookAuthor').textContent = `By ${author}`;
            document.getElementById('modalBookGenre').textContent = genre;
            document.getElementById('modalBookRating').textContent = `⭐ ${rating} / 5.0`;
            document.getElementById('modalBookLang').textContent = `Language: ${language}`;
            document.getElementById('modalBookPages').textContent = `Pages: ${pages}`;
            document.getElementById('modalBookSynopsis').textContent = synopsis;

            const modalCover = document.getElementById('modalBookCover');
            modalCover.className = `sb-cover-styled ${coverClass}`;
            modalCover.innerHTML = `<div class="sb-cover-title" style="font-size: 0.9rem;">${title.toUpperCase()}</div>`;

            // Setup modal action button
            const modalAddBtn = document.getElementById('modalAddBtn');
            modalAddBtn.setAttribute('data-book', title);
            modalAddBtn.onclick = async () => {
                try {
                    await fetch('/api/library', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bookId: bookId, title: title, status: 'want-to-read' })
                    });
                } catch (err) {}
                showToast(`"${title}" added to My Books shelf!`, 'success');
                if (bsModal) bsModal.hide();
            };

            if (bsModal) bsModal.show();
        });
    });

    // 9. Toast Notification Utility — Delegated to Centralized SmartAlert System
    function showToast(message, type = 'info') {
        if (window.SmartAlert) {
            SmartAlert.toast(message, type);
        }
    }

    // Initial catalog render
    updateBookGrid();
});
