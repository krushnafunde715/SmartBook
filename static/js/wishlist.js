/**
 * SmartBook — My Wishlist Interactive Engine
 * Handles saved books, sorting, filtering, moving to My Books, removals, and backend API synchronization
 */

document.addEventListener('DOMContentLoaded', () => {
    const DEFAULT_WISHLIST = [
        {
            id: 1,
            bookId: 7,
            title: 'Thinking, Fast and Slow',
            author: 'Daniel Kahneman',
            genre: 'Psychology',
            rating: 4.7,
            pages: 512,
            coverClass: 'psychology',
            coverTitle: 'THINKING<br>FAST & SLOW',
            coverGradient: 'linear-gradient(135deg, #2E1A47 0%, #4A2E75 100%)',
            desc: 'Explores the dual systems of the human mind: the fast, intuitive System 1 and the slow, deliberate System 2.',
            synopsis: 'Daniel Kahneman, recipient of the Nobel Prize in Economics, takes us on a groundbreaking tour of the mind and explains the two systems that drive the way we think and make choices.',
            addedDate: '2026-09-28'
        },
        {
            id: 2,
            bookId: 8,
            title: 'The Silent Patient',
            author: 'Alex Michaelides',
            genre: 'Thriller',
            rating: 4.7,
            pages: 336,
            coverClass: 'silent',
            coverTitle: 'THE SILENT<br>PATIENT',
            coverGradient: 'linear-gradient(135deg, #4A0E17 0%, #7A1C2B 100%)',
            desc: 'A shocking psychological thriller of a woman’s act of violence against her husband—and of the therapist obsessed with uncovering her motive.',
            synopsis: 'Alicia Berenson’s life is seemingly perfect. One evening she shoots her husband five times in the face and never speaks another word.',
            addedDate: '2026-09-27'
        },
        {
            id: 3,
            bookId: 9,
            title: '1984',
            author: 'George Orwell',
            genre: 'Fiction',
            rating: 4.9,
            pages: 328,
            coverClass: 'hailmary',
            coverTitle: '1984',
            coverGradient: 'linear-gradient(135deg, #881337 0%, #9F1239 100%)',
            desc: 'The classic dystopian masterpiece about totalitarian surveillance, propaganda, and the struggle for human liberty.',
            synopsis: 'Winston Smith toes the Party line, rewriting history to satisfy the Ministry of Truth. With every lie he writes, he grows to hate the Party.',
            addedDate: '2026-09-25'
        },
        {
            id: 4,
            bookId: 10,
            title: 'Educated',
            author: 'Tara Westover',
            genre: 'Biography',
            rating: 4.9,
            pages: 352,
            coverClass: 'alchemist',
            coverTitle: 'EDUCATED',
            coverGradient: 'linear-gradient(135deg, #004D40 0%, #00695C 100%)',
            desc: 'An unforgettable memoir of resilience, fierce determination, and the struggle for self-invention through learning.',
            synopsis: 'Born to survivalists in the mountains of Idaho, Tara Westover was seventeen the first time she set foot in a classroom.',
            addedDate: '2026-09-22'
        }
    ];

    const WISHLIST_STORAGE_KEY = 'sb_wishlist_data';
    const MY_BOOKS_STORAGE_KEY = 'sb_my_books_data';

    // 1. Storage Helpers
    function getWishlist() {
        try {
            const data = localStorage.getItem(WISHLIST_STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.warn('LocalStorage error:', e);
        }
        return DEFAULT_WISHLIST;
    }

    function saveWishlist(items) {
        try {
            localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
        } catch (e) {
            console.warn('LocalStorage save error:', e);
        }
    }

    let wishlist = getWishlist();

    // DOM Elements
    const gridContainer = document.getElementById('wishlistGrid');
    const emptyState = document.getElementById('wishlistEmptyState');
    const countBadge = document.getElementById('wishlistCountBadge');
    const searchInput = document.getElementById('wishlistSearch');
    const topSearchInput = document.getElementById('sbTopSearch');
    const sortSelect = document.getElementById('wishlistSortSelect');
    const clearBtn = document.getElementById('wishlistClearFilters');

    // Modal Elements
    const wishModalElem = document.getElementById('sbWishModal');
    let bsWishModal = null;
    if (wishModalElem && window.bootstrap) {
        bsWishModal = new bootstrap.Modal(wishModalElem);
    }
    const modalWishCover = document.getElementById('modalWishCover');
    const modalWishTitle = document.getElementById('modalWishTitle');
    const modalWishAuthor = document.getElementById('modalWishAuthor');
    const modalWishGenre = document.getElementById('modalWishGenre');
    const modalWishRating = document.getElementById('modalWishRating');
    const modalWishPages = document.getElementById('modalWishPages');
    const modalWishSynopsis = document.getElementById('modalWishSynopsis');
    const modalWishAddBtn = document.getElementById('modalWishAddBtn');

    // 1.5 Load from Backend API
    async function loadWishlistFromBackend() {
        try {
            const res = await fetch('/api/wishlist');
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.items) {
                    wishlist = json.items;
                    saveWishlist(wishlist);
                    renderWishlist();
                }
            }
        } catch (err) {
            console.warn('Backend wishlist fetch error:', err);
        }
    }

    // 2. Render Engine
    function renderWishlist() {
        const query = (searchInput?.value || '').toLowerCase().trim();
        const sortBy = sortSelect?.value || 'added-desc';

        // Filter
        let matching = wishlist.filter(item => {
            if (!query) return true;
            return (item.title && item.title.toLowerCase().includes(query)) ||
                   (item.author && item.author.toLowerCase().includes(query)) ||
                   (item.genre && item.genre.toLowerCase().includes(query));
        });

        // Sort
        matching.sort((a, b) => {
            if (sortBy === 'added-desc') {
                return (b.addedDate || '').localeCompare(a.addedDate || '');
            } else if (sortBy === 'title-asc') {
                return (a.title || '').localeCompare(b.title || '');
            } else if (sortBy === 'rating-desc') {
                return (b.rating || 0) - (a.rating || 0);
            }
            return 0;
        });

        // Update Counter
        if (countBadge) {
            countBadge.textContent = wishlist.length;
        }

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
                card.className = 'sb-wishlist-card';
                card.setAttribute('data-id', item.id);

                const coverStyle = item.coverGradient ? `background: ${item.coverGradient};` : '';

                card.innerHTML = `
                    <div>
                        <div class="sb-wishlist-card-top">
                            <div class="sb-wishlist-thumb">
                                <div class="sb-cover-styled ${item.coverClass || 'atomic'}" style="${coverStyle} height: 100%;">
                                    <div class="sb-cover-title">${item.coverTitle || item.title}</div>
                                </div>
                            </div>
                            <div class="sb-wishlist-details">
                                <span class="sb-rating-badge" style="align-self: flex-start; font-size: 0.72rem; padding: 0.15rem 0.45rem; margin-bottom: 0.25rem;">
                                    <i class="bi bi-star-fill"></i> ${item.rating || '4.8'}
                                </span>
                                <h3 class="sb-wishlist-book-title" title="${item.title}">${item.title}</h3>
                                <span class="sb-wishlist-book-author">${item.author}</span>
                                <span class="sb-explore-genre-tag" style="align-self: flex-start; font-size: 0.68rem; margin-top: 2px;">${item.genre}</span>
                            </div>
                        </div>
                        <p class="sb-wishlist-desc">${item.desc || item.synopsis || ''}</p>
                        <div class="sb-wishlist-meta-row">
                            <span><i class="bi bi-file-earmark-text me-1"></i>${item.pages || 300} pages</span>
                            <span><i class="bi bi-calendar-check me-1"></i>Saved ${formatDate(item.addedDate)}</span>
                        </div>
                    </div>
                    <div class="sb-wishlist-actions">
                        <div class="sb-wishlist-actions-row">
                            <button type="button" class="btn-wish-add-library" data-id="${item.id}">
                                <i class="bi bi-plus-lg"></i> Add to My Books
                            </button>
                            <button type="button" class="btn-wish-remove" data-id="${item.id}" title="Remove from Wishlist">
                                <i class="bi bi-heart-fill"></i>
                            </button>
                        </div>
                        <button type="button" class="btn-wish-details" data-id="${item.id}">
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
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    }

    // 3. Card Action Events
    function attachEvents() {
        // Add to My Books (Move from Wishlist to Library)
        document.querySelectorAll('.btn-wish-add-library').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = btn.getAttribute('data-id');
                const item = wishlist.find(b => String(b.id) === String(itemId));
                if (item) {
                    addBookToMyBooks(item);
                }
            });
        });

        // Remove from Wishlist
        document.querySelectorAll('.btn-wish-remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const itemId = btn.getAttribute('data-id');
                const item = wishlist.find(b => String(b.id) === String(itemId));
                if (item) {
                    wishlist = wishlist.filter(b => String(b.id) !== String(itemId));
                    saveWishlist(wishlist);
                    renderWishlist();
                    showToast(`Removed "${item.title}" from your Wishlist.`, 'info');

                    if (typeof item.id === 'number') {
                        try {
                            await fetch(`/api/wishlist/${item.id}`, { method: 'DELETE' });
                        } catch (err) {}
                    }
                }
            });
        });

        // View Details Modal
        document.querySelectorAll('.btn-wish-details, .sb-wishlist-thumb, .sb-wishlist-book-title').forEach(elem => {
            elem.addEventListener('click', (e) => {
                e.preventDefault();
                const card = elem.closest('.sb-wishlist-card');
                if (!card) return;
                const itemId = card.getAttribute('data-id');
                const book = wishlist.find(b => String(b.id) === String(itemId));
                if (book && bsWishModal) {
                    modalWishTitle.textContent = book.title;
                    modalWishAuthor.textContent = `By ${book.author}`;
                    modalWishGenre.textContent = book.genre;
                    modalWishRating.innerHTML = `<i class="bi bi-star-fill text-warning"></i> ${book.rating || '4.8'} / 5.0`;
                    modalWishPages.textContent = `Pages: ${book.pages || 300}`;
                    modalWishSynopsis.textContent = book.synopsis || book.desc || 'No description available.';

                    const coverStyle = book.coverGradient ? `background: ${book.coverGradient};` : '';
                    modalWishCover.className = `sb-cover-styled ${book.coverClass || 'atomic'}`;
                    modalWishCover.style = `${coverStyle} height: 100%;`;
                    modalWishCover.innerHTML = `<div class="sb-cover-title" style="font-size: 0.85rem;">${book.coverTitle || book.title}</div>`;

                    modalWishAddBtn.onclick = () => {
                        addBookToMyBooks(book);
                        bsWishModal.hide();
                    };

                    bsWishModal.show();
                }
            });
        });
    }

    // 4. Move Book into My Books (Want to Read)
    async function addBookToMyBooks(item) {
        // Optimistically remove from Wishlist
        wishlist = wishlist.filter(w => String(w.id) !== String(item.id));
        saveWishlist(wishlist);
        renderWishlist();

        showToast(`✨ "${item.title}" moved to your Want to Read shelf!`, 'success');

        // Call backend atomic move
        if (typeof item.id === 'number') {
            try {
                await fetch(`/api/wishlist/${item.id}/move-to-library`, { method: 'POST' });
            } catch (err) {
                console.warn('Backend move error:', err);
            }
        }
    }

    // 5. Search & Filters Listeners
    if (searchInput) {
        searchInput.addEventListener('input', renderWishlist);
    }

    if (topSearchInput) {
        topSearchInput.addEventListener('input', (e) => {
            if (searchInput) searchInput.value = e.target.value;
            renderWishlist();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', renderWishlist);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (topSearchInput) topSearchInput.value = '';
            if (sortSelect) sortSelect.value = 'added-desc';
            renderWishlist();
            showToast('Wishlist filters cleared', 'info');
        });
    }

    // 6. Toast Notification System — Delegated to Centralized SmartAlert System
    function showToast(message, type = 'info') {
        if (window.SmartAlert) {
            SmartAlert.toast(message, type);
        }
    }

    // Initial render & sync
    renderWishlist();
    loadWishlistFromBackend();
});
