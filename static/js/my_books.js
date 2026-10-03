/**
 * SmartBook — My Books & Personal Reading Tracker Engine
 * Handles shelves, reading progress, state transitions, modals, search, and backend API persistence
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Default Seed Library
    const DEFAULT_MY_BOOKS = [
        {
            id: 1,
            bookId: 1,
            title: 'Atomic Habits',
            author: 'James Clear',
            genre: 'Self-Help',
            status: 'currently-reading',
            currentPage: 192,
            totalPages: 320,
            rating: 4.9,
            coverClass: 'atomic',
            coverTitle: 'Atomic<br>Habits',
            synopsis: 'An extraordinarily practical guide that breaks down complex behavioral science into simple daily actions.',
            addedDate: '2026-09-15'
        },
        {
            id: 2,
            bookId: 2,
            title: 'Project Hail Mary',
            author: 'Andy Weir',
            genre: 'Science Fiction',
            status: 'currently-reading',
            currentPage: 280,
            totalPages: 496,
            rating: 4.9,
            coverClass: 'hailmary',
            coverTitle: 'PROJECT<br>HAIL MARY',
            coverGradient: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
            synopsis: 'Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself will perish.',
            addedDate: '2026-09-18'
        },
        {
            id: 3,
            bookId: 3,
            title: 'The Alchemist',
            author: 'Paulo Coelho',
            genre: 'Fiction',
            status: 'want-to-read',
            currentPage: 0,
            totalPages: 208,
            rating: 4.8,
            coverClass: 'alchemist',
            coverTitle: 'THE<br>ALCHEMIST',
            synopsis: 'A mystical story of Santiago, an Andalusian shepherd boy who yearns to travel in search of a worldly treasure.',
            addedDate: '2026-09-20'
        },
        {
            id: 4,
            bookId: 4,
            title: 'Clean Code',
            author: 'Robert C. Martin',
            genre: 'Technology',
            status: 'want-to-read',
            currentPage: 0,
            totalPages: 464,
            rating: 4.7,
            coverClass: 'clean',
            coverTitle: 'Clean Code',
            synopsis: 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees.',
            addedDate: '2026-09-22'
        },
        {
            id: 5,
            bookId: 5,
            title: 'Dune',
            author: 'Frank Herbert',
            genre: 'Science Fiction',
            status: 'want-to-read',
            currentPage: 0,
            totalPages: 688,
            rating: 4.8,
            coverClass: 'dune',
            coverTitle: 'DUNE',
            coverGradient: 'linear-gradient(135deg, #78350F 0%, #B45309 100%)',
            synopsis: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family.',
            addedDate: '2026-09-25'
        },
        {
            id: 6,
            bookId: 6,
            title: 'The Psychology of Money',
            author: 'Morgan Housel',
            genre: 'Self-Help',
            status: 'completed',
            currentPage: 256,
            totalPages: 256,
            rating: 4.8,
            coverClass: 'psychology',
            coverTitle: 'PSYCHOLOGY<br>OF MONEY',
            coverGradient: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
            synopsis: 'Doing well with money isn\'t necessarily about what you know. It\'s about how you behave.',
            completedDate: '2026-09-28',
            addedDate: '2026-09-10'
        }
    ];

    const STORAGE_KEY = 'sb_my_books_data';

    // 2. Load or Initialize Data
    function getMyBooks() {
        const initDataEl = document.getElementById('initial-library-data');
        if (initDataEl && initDataEl.textContent.trim()) {
            try {
                const parsed = JSON.parse(initDataEl.textContent);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    saveMyBooks(parsed);
                    return parsed;
                }
            } catch (e) {
                console.warn('Initial data parse error:', e);
            }
        }
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.warn('LocalStorage error:', e);
        }
        return [];
    }

    function saveMyBooks(books) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
        } catch (e) {
            console.warn('LocalStorage save error:', e);
        }
    }

    let myBooks = getMyBooks();
    let currentFilterShelf = 'all';
    let searchQuery = '';
    let selectedBookForProgress = null;

    // DOM Elements
    const gridCurrentlyReading = document.getElementById('gridCurrentlyReading');
    const gridWantToRead = document.getElementById('gridWantToRead');
    const gridCompleted = document.getElementById('gridCompleted');

    const emptyCurrentlyReading = document.getElementById('emptyCurrentlyReading');
    const emptyWantToRead = document.getElementById('emptyWantToRead');
    const emptyCompleted = document.getElementById('emptyCompleted');

    const countCurrentlyReading = document.getElementById('countCurrentlyReading');
    const countWantToRead = document.getElementById('countWantToRead');
    const countCompleted = document.getElementById('countCompleted');

    const totalBooksCount = document.getElementById('totalBooksCount');
    const tabCountAll = document.getElementById('tabCountAll');
    const tabCountReading = document.getElementById('tabCountReading');
    const tabCountWant = document.getElementById('tabCountWant');
    const tabCountCompleted = document.getElementById('tabCountCompleted');

    const sectionCurrentlyReading = document.getElementById('sectionCurrentlyReading');
    const sectionWantToRead = document.getElementById('sectionWantToRead');
    const sectionCompleted = document.getElementById('sectionCompleted');

    const searchInput = document.getElementById('myBooksSearch');
    const topSearchInput = document.getElementById('sbTopSearch');
    const shelfTabs = document.querySelectorAll('.sb-shelf-tab');

    // Progress Modal Elements
    const progressModalElem = document.getElementById('sbProgressModal');
    let bsProgressModal = null;
    if (progressModalElem && window.bootstrap) {
        bsProgressModal = new bootstrap.Modal(progressModalElem);
    }
    const modalProgCover = document.getElementById('modalProgCover');
    const modalProgBookTitle = document.getElementById('modalProgBookTitle');
    const modalProgBookAuthor = document.getElementById('modalProgBookAuthor');
    const modalProgBookGenre = document.getElementById('modalProgBookGenre');
    const modalProgTotalPages = document.getElementById('modalProgTotalPages');
    const modalProgPctText = document.getElementById('modalProgPctText');
    const modalProgInput = document.getElementById('modalProgInput');
    const modalProgSlider = document.getElementById('modalProgSlider');
    const btnSaveProgress = document.getElementById('btnSaveProgress');
    const btnFinishBook = document.getElementById('btnFinishBook');
    const quickAddBtns = document.querySelectorAll('.btn-quick-add[data-add]');

    // Book Details Modal Elements
    const detailsModalElem = document.getElementById('sbMyBooksDetailsModal');
    let bsDetailsModal = null;
    if (detailsModalElem && window.bootstrap) {
        bsDetailsModal = new bootstrap.Modal(detailsModalElem);
    }
    const modalDetailsTitle = document.getElementById('modalDetailsTitle');
    const modalDetailsCover = document.getElementById('modalDetailsCover');
    const modalDetailsRating = document.getElementById('modalDetailsRating');
    const modalDetailsGenre = document.getElementById('modalDetailsGenre');
    const modalDetailsPages = document.getElementById('modalDetailsPages');
    const modalDetailsShelf = document.getElementById('modalDetailsShelf');
    const modalDetailsAuthor = document.getElementById('modalDetailsAuthor');
    const modalDetailsSynopsis = document.getElementById('modalDetailsSynopsis');
    const modalDetailsActionBtn = document.getElementById('modalDetailsActionBtn');

    // 2.5 Backend Fetch
    async function loadLibraryFromBackend() {
        try {
            const res = await fetch('/api/library');
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    myBooks = json.books || [];
                    saveMyBooks(myBooks);
                    renderShelves();
                }
            }
        } catch (err) {
            console.warn('Backend library fetch error:', err);
        }
    }

    // 3. Render All Shelves
    function renderShelves() {
        const query = searchQuery.toLowerCase().trim();

        const readingBooks = myBooks.filter(b => b.status === 'currently-reading' && matchesSearch(b, query));
        const wantBooks = myBooks.filter(b => b.status === 'want-to-read' && matchesSearch(b, query));
        const completedBooks = myBooks.filter(b => b.status === 'completed' && matchesSearch(b, query));

        // Update counts
        const allCount = myBooks.length;
        const totalReading = myBooks.filter(b => b.status === 'currently-reading').length;
        const totalWant = myBooks.filter(b => b.status === 'want-to-read').length;
        const totalCompleted = myBooks.filter(b => b.status === 'completed').length;

        if (totalBooksCount) totalBooksCount.textContent = allCount;
        if (tabCountAll) tabCountAll.textContent = allCount;
        if (tabCountReading) tabCountReading.textContent = totalReading;
        if (tabCountWant) tabCountWant.textContent = totalWant;
        if (tabCountCompleted) tabCountCompleted.textContent = totalCompleted;

        if (countCurrentlyReading) countCurrentlyReading.textContent = `${readingBooks.length} book${readingBooks.length === 1 ? '' : 's'}`;
        if (countWantToRead) countWantToRead.textContent = `${wantBooks.length} book${wantBooks.length === 1 ? '' : 's'}`;
        if (countCompleted) countCompleted.textContent = `${completedBooks.length} book${completedBooks.length === 1 ? '' : 's'}`;

        // Render Currently Reading Grid
        renderShelfGrid(gridCurrentlyReading, emptyCurrentlyReading, readingBooks, 'currently-reading');

        // Render Want to Read Grid
        renderShelfGrid(gridWantToRead, emptyWantToRead, wantBooks, 'want-to-read');

        // Render Completed Grid
        renderShelfGrid(gridCompleted, emptyCompleted, completedBooks, 'completed');

        // Apply Shelf Tab visibility
        applyShelfFilter();
    }

    function matchesSearch(book, query) {
        if (!query) return true;
        return (book.title && book.title.toLowerCase().includes(query)) ||
               (book.author && book.author.toLowerCase().includes(query)) ||
               (book.genre && book.genre.toLowerCase().includes(query));
    }

    // 4. Render Single Shelf Grid
    function renderShelfGrid(container, emptyElem, books, shelfType) {
        if (!container) return;
        container.innerHTML = '';

        if (books.length === 0) {
            container.style.display = 'none';
            if (emptyElem) emptyElem.style.display = 'flex';
            return;
        }

        container.style.display = 'grid';
        if (emptyElem) emptyElem.style.display = 'none';

        books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'sb-shelf-card';
            card.setAttribute('data-book-id', book.id);

            const curPage = book.currentPage || 0;
            const totPages = book.totalPages || 300;
            const pct = Math.min(100, Math.round((curPage / totPages) * 100));

            const coverGradientStyle = book.coverGradient ? `background: ${book.coverGradient};` : '';

            // Card Header / Top
            const cardTopHtml = `
                <div class="sb-shelf-card-top">
                    <div class="sb-shelf-thumb action-trigger-details" data-id="${book.id}">
                        <div class="sb-cover-styled ${book.coverClass || 'atomic'}" style="${coverGradientStyle} height: 100%;">
                            <div class="sb-cover-title" style="font-size: 0.72rem;">${book.coverTitle || book.title}</div>
                        </div>
                    </div>
                    <div class="sb-shelf-details">
                        <div class="d-flex align-items-center justify-content-between mb-1">
                            ${getStatusPillHtml(shelfType, pct)}
                            <span class="sb-shelf-rating"><i class="bi bi-star-fill text-warning"></i> ${book.rating || '4.8'}</span>
                        </div>
                        <h3 class="sb-shelf-title action-trigger-details" data-id="${book.id}" title="${book.title}">${book.title}</h3>
                        <span class="sb-shelf-author">By ${book.author}</span>
                        <div class="mt-1">
                            <span class="badge bg-light text-secondary" style="font-size: 0.7rem; font-weight: 500;">${book.genre}</span>
                        </div>
                    </div>
                </div>
            `;

            // Progress / Status middle section
            let middleHtml = '';
            if (shelfType === 'currently-reading') {
                middleHtml = `
                    <div class="sb-progress-tracker-box">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span style="font-size: 0.76rem; color: #5E6662; font-weight: 600;">Reading Progress</span>
                            <span style="font-size: 0.76rem; font-weight: 700; color: #163E30;">${curPage} / ${totPages} pages (${pct}%)</span>
                        </div>
                        <div class="progress" style="height: 6px; background-color: #E8ECE9; border-radius: 4px;">
                            <div class="progress-bar" role="progressbar" style="width: ${pct}%; background-color: #163E30; border-radius: 4px;" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                `;
            } else if (shelfType === 'want-to-read') {
                middleHtml = `
                    <div class="sb-shelf-meta-box">
                        <div class="d-flex justify-content-between align-items-center">
                            <span style="font-size: 0.75rem; color: #747C78;"><i class="bi bi-book me-1"></i> ${totPages} pages</span>
                            <span style="font-size: 0.72rem; color: #5E6662;">Ready to start</span>
                        </div>
                    </div>
                `;
            } else if (shelfType === 'completed') {
                middleHtml = `
                    <div class="sb-shelf-meta-box completed">
                        <div class="d-flex justify-content-between align-items-center">
                            <span style="font-size: 0.75rem; color: #163E30; font-weight: 600;"><i class="bi bi-check-circle-fill text-success me-1"></i> Read ${totPages} pages</span>
                            <span style="font-size: 0.72rem; color: #5E6662;">Finished</span>
                        </div>
                    </div>
                `;
            }

            // Action Buttons
            let actionsHtml = '';
            if (shelfType === 'currently-reading') {
                actionsHtml = `
                    <div class="sb-shelf-actions">
                        <button type="button" class="btn-shelf-primary btn-continue-reading" data-id="${book.id}">
                            <i class="bi bi-bookmark-check"></i> Update Progress
                        </button>
                        <div class="dropdown">
                            <button class="btn-shelf-menu" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Shelf options">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end dropdown-menu-smartbook">
                                <li><a class="dropdown-item-smartbook action-view-details" data-id="${book.id}"><i class="bi bi-info-circle text-info"></i> View Details</a></li>
                                <li><a class="dropdown-item-smartbook action-move" data-id="${book.id}" data-target="completed"><i class="bi bi-check2-circle text-success"></i> Mark as Completed</a></li>
                                <li><a class="dropdown-item-smartbook action-move" data-id="${book.id}" data-target="want-to-read"><i class="bi bi-bookmark-plus text-warning"></i> Move to Want to Read</a></li>
                                <li><hr class="dropdown-divider my-1"></li>
                                <li><a class="dropdown-item-smartbook text-danger action-remove" data-id="${book.id}"><i class="bi bi-trash"></i> Remove from Library</a></li>
                            </ul>
                        </div>
                    </div>
                `;
            } else if (shelfType === 'want-to-read') {
                actionsHtml = `
                    <div class="sb-shelf-actions">
                        <button type="button" class="btn-shelf-primary btn-start-reading" data-id="${book.id}">
                            <i class="bi bi-play-circle"></i> Start Reading
                        </button>
                        <div class="dropdown">
                            <button class="btn-shelf-menu" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Shelf options">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end dropdown-menu-smartbook">
                                <li><a class="dropdown-item-smartbook action-view-details" data-id="${book.id}"><i class="bi bi-info-circle text-info"></i> View Details</a></li>
                                <li><a class="dropdown-item-smartbook action-move" data-id="${book.id}" data-target="completed"><i class="bi bi-check2-circle text-success"></i> Mark as Completed</a></li>
                                <li><hr class="dropdown-divider my-1"></li>
                                <li><a class="dropdown-item-smartbook text-danger action-remove" data-id="${book.id}"><i class="bi bi-trash"></i> Remove from Library</a></li>
                            </ul>
                        </div>
                    </div>
                `;
            } else if (shelfType === 'completed') {
                actionsHtml = `
                    <div class="sb-shelf-actions">
                        <button type="button" class="btn-shelf-secondary btn-reread" data-id="${book.id}">
                            <i class="bi bi-arrow-repeat"></i> Read Again
                        </button>
                        <div class="dropdown">
                            <button class="btn-shelf-menu" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Shelf options">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end dropdown-menu-smartbook">
                                <li><a class="dropdown-item-smartbook action-view-details" data-id="${book.id}"><i class="bi bi-info-circle text-info"></i> View Details</a></li>
                                <li><a class="dropdown-item-smartbook action-move" data-id="${book.id}" data-target="currently-reading"><i class="bi bi-book-half text-primary"></i> Move to Currently Reading</a></li>
                                <li><a class="dropdown-item-smartbook action-move" data-id="${book.id}" data-target="want-to-read"><i class="bi bi-bookmark-plus text-warning"></i> Move to Want to Read</a></li>
                                <li><hr class="dropdown-divider my-1"></li>
                                <li><a class="dropdown-item-smartbook text-danger action-remove" data-id="${book.id}"><i class="bi bi-trash"></i> Remove from Library</a></li>
                            </ul>
                        </div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div>
                    ${cardTopHtml}
                    ${middleHtml}
                </div>
                ${actionsHtml}
            `;

            container.appendChild(card);
        });

        attachCardEvents(container);
    }

    function getStatusPillHtml(shelfType, pct) {
        if (shelfType === 'currently-reading') {
            return `<span class="sb-shelf-status-pill reading"><i class="bi bi-book-half"></i> Reading (${pct}%)</span>`;
        } else if (shelfType === 'want-to-read') {
            return `<span class="sb-shelf-status-pill want"><i class="bi bi-bookmark"></i> Want to Read</span>`;
        } else if (shelfType === 'completed') {
            return `<span class="sb-shelf-status-pill completed"><i class="bi bi-check2"></i> Completed</span>`;
        }
        return '';
    }

    // 5. Card Event Listeners
    function attachCardEvents(container) {
        // View Details Triggers
        container.querySelectorAll('.action-trigger-details, .action-view-details').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const bookId = el.getAttribute('data-id');
                const book = myBooks.find(b => String(b.id) === String(bookId));
                if (book) {
                    openDetailsModal(book);
                }
            });
        });

        // Continue Reading -> Open Progress Modal
        container.querySelectorAll('.btn-continue-reading').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const bookId = btn.getAttribute('data-id');
                const book = myBooks.find(b => String(b.id) === String(bookId));
                if (book) {
                    openProgressModal(book);
                }
            });
        });

        // Start Reading -> Move to currently reading and open progress modal
        container.querySelectorAll('.btn-start-reading').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const bookId = btn.getAttribute('data-id');
                const book = myBooks.find(b => String(b.id) === String(bookId));
                if (book) {
                    book.status = 'currently-reading';
                    if (!book.currentPage || book.currentPage === 0) {
                        book.currentPage = 1;
                    }
                    saveMyBooks(myBooks);
                    renderShelves();
                    showToast(`Started reading "${book.title}"!`, 'success');

                    // Persist to backend
                    if (typeof book.id === 'number') {
                        try {
                            await fetch(`/api/library/${book.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'currently-reading', currentPage: book.currentPage })
                            });
                        } catch (err) {}
                    }

                    openProgressModal(book);
                }
            });
        });

        // Read Again -> Move to currently reading at page 1
        container.querySelectorAll('.btn-reread').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const bookId = btn.getAttribute('data-id');
                const book = myBooks.find(b => String(b.id) === String(bookId));
                if (book) {
                    book.status = 'currently-reading';
                    book.currentPage = 1;
                    saveMyBooks(myBooks);
                    renderShelves();
                    showToast(`Restarted "${book.title}" in Currently Reading!`, 'success');

                    if (typeof book.id === 'number') {
                        try {
                            await fetch(`/api/library/${book.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'currently-reading', currentPage: 1 })
                            });
                        } catch (err) {}
                    }

                    openProgressModal(book);
                }
            });
        });

        // Move to Shelf Action
        container.querySelectorAll('.action-move').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const bookId = item.getAttribute('data-id');
                const targetShelf = item.getAttribute('data-target');
                const book = myBooks.find(b => String(b.id) === String(bookId));
                if (book) {
                    book.status = targetShelf;
                    if (targetShelf === 'completed') {
                        book.currentPage = book.totalPages;
                    } else if (targetShelf === 'want-to-read') {
                        book.currentPage = 0;
                    } else if (targetShelf === 'currently-reading' && (!book.currentPage || book.currentPage === 0)) {
                        book.currentPage = 1;
                    }
                    saveMyBooks(myBooks);
                    renderShelves();

                    const shelfNames = {
                        'currently-reading': 'Currently Reading',
                        'want-to-read': 'Want to Read',
                        'completed': 'Completed'
                    };
                    showToast(`Moved "${book.title}" to ${shelfNames[targetShelf] || targetShelf}.`, 'success');

                    if (typeof book.id === 'number') {
                        try {
                            await fetch(`/api/library/${book.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: targetShelf, currentPage: book.currentPage })
                            });
                        } catch (err) {}
                    }
                }
            });
        });

        // Remove from Library
        container.querySelectorAll('.action-remove').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const bookId = item.getAttribute('data-id');
                const book = myBooks.find(b => String(b.id) === String(bookId));
                if (!book) return;

                const confirmed = await SmartAlert.confirm({
                    title: 'Remove from Library',
                    message: `Are you sure you want to remove "${book.title}" from your library shelves?`,
                    confirmText: 'Remove Book',
                    cancelText: 'Keep in Library',
                    type: 'danger'
                });

                if (confirmed) {
                    myBooks = myBooks.filter(b => String(b.id) !== String(bookId));
                    saveMyBooks(myBooks);
                    renderShelves();
                    SmartAlert.info(`Removed "${book.title}" from your library.`, 'Library Updated');

                    if (typeof book.id === 'number') {
                        try {
                            await fetch(`/api/library/${book.id}`, { method: 'DELETE' });
                        } catch (err) {}
                    }
                }
            });
        });
    }

    // 6. Progress Modal Controller
    function openProgressModal(book) {
        selectedBookForProgress = book;
        if (!bsProgressModal) return;

        modalProgBookTitle.textContent = book.title;
        modalProgBookAuthor.textContent = `By ${book.author}`;
        modalProgBookGenre.textContent = book.genre;
        modalProgTotalPages.textContent = book.totalPages;

        const cur = book.currentPage || 0;
        const total = book.totalPages || 1;
        const pct = Math.min(100, Math.round((cur / total) * 100));

        modalProgPctText.textContent = `${pct}%`;
        modalProgInput.value = cur;
        modalProgInput.max = total;
        modalProgSlider.max = total;
        modalProgSlider.value = cur;

        modalProgCover.className = `sb-cover-styled ${book.coverClass || 'atomic'}`;
        modalProgCover.style = book.coverGradient ? `background: ${book.coverGradient}; height: 100%;` : 'height: 100%;';
        modalProgCover.innerHTML = `<div class="sb-cover-title" style="font-size: 0.65rem;">${book.coverTitle || book.title}</div>`;

        bsProgressModal.show();
    }

    // 6.2 Details Modal Controller
    function openDetailsModal(book) {
        if (!bsDetailsModal) return;

        if (modalDetailsTitle) modalDetailsTitle.textContent = book.title;
        if (modalDetailsAuthor) modalDetailsAuthor.textContent = `By ${book.author}`;
        if (modalDetailsGenre) modalDetailsGenre.textContent = book.genre;
        if (modalDetailsRating) modalDetailsRating.innerHTML = `<i class="bi bi-star-fill text-warning"></i> ${book.rating || '4.8'} / 5.0`;
        if (modalDetailsPages) modalDetailsPages.textContent = `Pages: ${book.totalPages}`;

        if (modalDetailsShelf) {
            let shelfLabel = 'Currently Reading';
            if (book.status === 'want-to-read') shelfLabel = 'Want to Read';
            if (book.status === 'completed') shelfLabel = 'Completed';
            modalDetailsShelf.textContent = `Shelf: ${shelfLabel}`;
        }

        if (modalDetailsSynopsis) {
            modalDetailsSynopsis.textContent = book.synopsis || `${book.title} is a standout work in ${book.genre}. Add notes and track your reading progress to capture every breakthrough idea.`;
        }

        if (modalDetailsCover) {
            modalDetailsCover.className = `sb-cover-styled ${book.coverClass || 'atomic'}`;
            modalDetailsCover.style = book.coverGradient ? `background: ${book.coverGradient}; height: 100%;` : 'height: 100%;';
            modalDetailsCover.innerHTML = `<div class="sb-cover-title" style="font-size: 0.9rem;">${book.coverTitle || book.title}</div>`;
        }

        if (modalDetailsActionBtn) {
            if (book.status === 'currently-reading') {
                modalDetailsActionBtn.innerHTML = '<i class="bi bi-bookmark-check"></i> Update Progress';
                modalDetailsActionBtn.onclick = () => {
                    bsDetailsModal.hide();
                    setTimeout(() => openProgressModal(book), 300);
                };
            } else if (book.status === 'want-to-read') {
                modalDetailsActionBtn.innerHTML = '<i class="bi bi-play-circle"></i> Start Reading';
                modalDetailsActionBtn.onclick = async () => {
                    book.status = 'currently-reading';
                    if (!book.currentPage || book.currentPage === 0) book.currentPage = 1;
                    saveMyBooks(myBooks);
                    renderShelves();
                    bsDetailsModal.hide();
                    showToast(`Started reading "${book.title}"!`, 'success');

                    if (typeof book.id === 'number') {
                        try {
                            await fetch(`/api/library/${book.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'currently-reading', currentPage: 1 })
                            });
                        } catch (err) {}
                    }
                    setTimeout(() => openProgressModal(book), 300);
                };
            } else if (book.status === 'completed') {
                modalDetailsActionBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Read Again';
                modalDetailsActionBtn.onclick = async () => {
                    book.status = 'currently-reading';
                    book.currentPage = 1;
                    saveMyBooks(myBooks);
                    renderShelves();
                    bsDetailsModal.hide();
                    showToast(`Restarted "${book.title}" in Currently Reading!`, 'success');

                    if (typeof book.id === 'number') {
                        try {
                            await fetch(`/api/library/${book.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'currently-reading', currentPage: 1 })
                            });
                        } catch (err) {}
                    }
                    setTimeout(() => openProgressModal(book), 300);
                };
            }
        }

        bsDetailsModal.show();
    }

    function syncProgressValues(val) {
        if (!selectedBookForProgress) return;
        const total = selectedBookForProgress.totalPages || 1;
        let page = parseInt(val) || 0;
        if (page < 0) page = 0;
        if (page > total) page = total;

        modalProgInput.value = page;
        modalProgSlider.value = page;
        const pct = Math.min(100, Math.round((page / total) * 100));
        modalProgPctText.textContent = `${pct}%`;
    }

    if (modalProgInput) {
        modalProgInput.addEventListener('input', (e) => syncProgressValues(e.target.value));
    }
    if (modalProgSlider) {
        modalProgSlider.addEventListener('input', (e) => syncProgressValues(e.target.value));
    }

    quickAddBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const add = parseInt(btn.getAttribute('data-add')) || 0;
            const current = parseInt(modalProgInput.value) || 0;
            syncProgressValues(current + add);
        });
    });

    if (btnFinishBook) {
        btnFinishBook.addEventListener('click', () => {
            if (selectedBookForProgress) {
                syncProgressValues(selectedBookForProgress.totalPages);
            }
        });
    }

    if (btnSaveProgress) {
        btnSaveProgress.addEventListener('click', async () => {
            if (!selectedBookForProgress) return;

            const newPage = parseInt(modalProgInput.value) || 0;
            selectedBookForProgress.currentPage = newPage;

            let isFinished = false;
            if (newPage >= selectedBookForProgress.totalPages) {
                selectedBookForProgress.status = 'completed';
                selectedBookForProgress.currentPage = selectedBookForProgress.totalPages;
                isFinished = true;
                showToast(`🎉 Congratulations on completing "${selectedBookForProgress.title}"!`, 'success');
            } else {
                showToast(`Progress updated to page ${newPage} (${Math.round((newPage / selectedBookForProgress.totalPages) * 100)}%).`, 'success');
            }

            saveMyBooks(myBooks);
            renderShelves();
            if (bsProgressModal) bsProgressModal.hide();

            // Persist to backend database
            if (typeof selectedBookForProgress.id === 'number') {
                try {
                    await fetch(`/api/library/${selectedBookForProgress.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            currentPage: newPage,
                            status: isFinished ? 'completed' : selectedBookForProgress.status
                        })
                    });
                } catch (err) {}
            }
        });
    }

    // 7. Shelf Switcher Tabs
    shelfTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            shelfTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilterShelf = tab.getAttribute('data-shelf-filter') || 'all';
            applyShelfFilter();
        });
    });

    function applyShelfFilter() {
        if (currentFilterShelf === 'all') {
            if (sectionCurrentlyReading) sectionCurrentlyReading.style.display = 'block';
            if (sectionWantToRead) sectionWantToRead.style.display = 'block';
            if (sectionCompleted) sectionCompleted.style.display = 'block';
        } else if (currentFilterShelf === 'currently-reading') {
            if (sectionCurrentlyReading) sectionCurrentlyReading.style.display = 'block';
            if (sectionWantToRead) sectionWantToRead.style.display = 'none';
            if (sectionCompleted) sectionCompleted.style.display = 'none';
        } else if (currentFilterShelf === 'want-to-read') {
            if (sectionCurrentlyReading) sectionCurrentlyReading.style.display = 'none';
            if (sectionWantToRead) sectionWantToRead.style.display = 'block';
            if (sectionCompleted) sectionCompleted.style.display = 'none';
        } else if (currentFilterShelf === 'completed') {
            if (sectionCurrentlyReading) sectionCurrentlyReading.style.display = 'none';
            if (sectionWantToRead) sectionWantToRead.style.display = 'none';
            if (sectionCompleted) sectionCompleted.style.display = 'block';
        }
    }

    // 8. Search Filter Listener
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderShelves();
        });
    }

    if (topSearchInput) {
        topSearchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            if (searchInput) searchInput.value = e.target.value;
            renderShelves();
        });
    }

    // 9. Toast Notification System — Delegated to Centralized SmartAlert System
    function showToast(message, type = 'info') {
        if (window.SmartAlert) {
            SmartAlert.toast(message, type);
        }
    }

    // Initial URL query parameter check for direct shelf filtering
    const urlParams = new URLSearchParams(window.location.search);
    const initialShelf = urlParams.get('shelf');
    if (initialShelf && ['all', 'currently-reading', 'want-to-read', 'completed'].includes(initialShelf)) {
        currentFilterShelf = initialShelf;
        shelfTabs.forEach(t => {
            if (t.getAttribute('data-shelf-filter') === initialShelf) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
    }

    // Initial render & sync
    renderShelves();
    if (!myBooks || myBooks.length === 0) {
        loadLibraryFromBackend();
    }
});
