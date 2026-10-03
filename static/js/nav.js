/**
 * SmartBook — Global Responsive Navigation & Mobile Drawer Controller
 * Handles sidebar drawer toggling, touch/keyboard interactions, backdrop overlay,
 * and seamless navigation across mobile and split-screen viewports.
 */

document.addEventListener('DOMContentLoaded', () => {
    const mobileToggleBtn = document.getElementById('sbMobileToggleBtn');
    const sidebar = document.getElementById('sbDashSidebar') || document.querySelector('.sb-dash-sidebar');
    const closeBtn = document.getElementById('sbSidebarCloseBtn');
    let backdrop = document.getElementById('sbSidebarBackdrop');

    if (!backdrop && sidebar) {
        backdrop = document.createElement('div');
        backdrop.id = 'sbSidebarBackdrop';
        backdrop.className = 'sb-sidebar-backdrop';
        document.body.appendChild(backdrop);
    }

    function openSidebar() {
        if (sidebar) {
            sidebar.classList.add('show');
        }
        if (backdrop) {
            backdrop.classList.add('show');
        }
        document.body.classList.add('sb-sidebar-open');
    }

    function closeSidebar() {
        if (sidebar) {
            sidebar.classList.remove('show');
        }
        if (backdrop) {
            backdrop.classList.remove('show');
        }
        document.body.classList.remove('sb-sidebar-open');
    }

    if (mobileToggleBtn) {
        mobileToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (sidebar && sidebar.classList.contains('show')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeSidebar();
        });
    }

    if (backdrop) {
        backdrop.addEventListener('click', () => {
            closeSidebar();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSidebar();
        }
    });

    // Close mobile drawer when a nav link is clicked
    if (sidebar) {
        const navLinks = sidebar.querySelectorAll('.sb-dash-nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 991.98) {
                    closeSidebar();
                }
            });
        });
    }

    // Header search submission on Enter if on pages other than catalog search
    const topSearch = document.getElementById('sbTopSearch');
    if (topSearch && !document.getElementById('sbBookSearch') && !document.getElementById('myBooksSearch')) {
        topSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && topSearch.value.trim()) {
                window.location.href = `/explore?q=${encodeURIComponent(topSearch.value.trim())}`;
            }
        });
    }
});
