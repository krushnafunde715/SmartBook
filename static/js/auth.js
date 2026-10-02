/**
 * SMARTBOOK — AUTHENTICATION JAVASCRIPT
 * Handles independent password visibility toggling and client-side form validation.
 */

document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
    initRegistrationValidation();
    syncGlobalUserProfile();
    initLogoutHandlers();
});

/**
 * Independent Show/Hide Password Visibility Toggle
 */
function initPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.sb-toggle-password');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;

            const isPassword = input.getAttribute('type') === 'password';
            input.setAttribute('type', isPassword ? 'text' : 'password');

            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
            }
        });
    });
}

/**
 * Client-Side Registration Form Validation
 */
function initRegistrationValidation() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const nameInput = document.getElementById('full_name');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirm_password');
    const termsCheck = document.getElementById('terms');

    // Real-time matching validation
    if (confirmInput && passInput) {
        confirmInput.addEventListener('input', () => {
            if (confirmInput.value && passInput.value !== confirmInput.value) {
                confirmInput.classList.add('is-invalid');
            } else {
                confirmInput.classList.remove('is-invalid');
            }
        });
    }

    form.addEventListener('submit', (e) => {
        let isValid = true;

        // 1. Full Name Validation
        if (!nameInput.value.trim()) {
            nameInput.classList.add('is-invalid');
            isValid = false;
        } else {
            nameInput.classList.remove('is-invalid');
        }

        // 2. Email Validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailInput.value.trim() || !emailPattern.test(emailInput.value.trim())) {
            emailInput.classList.add('is-invalid');
            isValid = false;
        } else {
            emailInput.classList.remove('is-invalid');
        }

        // 3. Password Validation (Min 8 chars)
        if (!passInput.value || passInput.value.length < 8) {
            passInput.classList.add('is-invalid');
            isValid = false;
        } else {
            passInput.classList.remove('is-invalid');
        }

        // 4. Confirm Password Match
        if (!confirmInput.value || confirmInput.value !== passInput.value) {
            confirmInput.classList.add('is-invalid');
            isValid = false;
        } else {
            confirmInput.classList.remove('is-invalid');
        }

        // 5. Terms & Conditions Checkbox
        if (!termsCheck.checked) {
            termsCheck.classList.add('is-invalid');
            isValid = false;
        } else {
            termsCheck.classList.remove('is-invalid');
        }

        if (!isValid) {
            e.preventDefault();
            e.stopPropagation();
            if (window.SmartAlert) {
                SmartAlert.warning('Please review and complete the highlighted fields before proceeding.', 'Validation Required');
            }
        }
    });
}

/**
 * Global User Profile & Avatar Synchronizer
 * Synchronizes the authenticated user's profile photo, name, and fallback initials across all pages.
 */
async function syncGlobalUserProfile() {
    const STORAGE_KEY = 'sb_user_profile_data';
    const DEFAULT_NAME = 'Krushna Patel';
    const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80';

    let userProfile = null;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            userProfile = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Could not read user profile from storage:', e);
    }

    function applyProfileToDOM(data) {
        const fullName = (data && data.fullName && data.fullName.trim().length > 0) ? data.fullName.trim() : DEFAULT_NAME;
        const firstName = fullName.split(' ')[0] || 'Krushna';
        const avatarUrl = (data && data.avatarUrl && data.avatarUrl.trim().length > 0) ? data.avatarUrl.trim() : DEFAULT_AVATAR;

        // Generate standard consistent initials fallback with SmartBook brand background #163E30
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=163E30&color=fff&size=160&bold=true`;

        // 1. Update all top navigation and card avatars across all views
        const avatarImages = document.querySelectorAll('.sb-dash-avatar, #navAvatarImg, #profileSummaryAvatar, .sb-user-avatar-img');
        avatarImages.forEach(img => {
            img.alt = fullName;
            img.src = avatarUrl || fallbackUrl;
            img.onerror = () => {
                img.src = fallbackUrl;
            };
        });

        // 2. Update all top-nav username labels
        const usernameLabels = document.querySelectorAll('.sb-dash-username, #navUsername');
        usernameLabels.forEach(label => {
            label.textContent = firstName;
        });

        // 3. Update dashboard hero greeting if present
        const heroName = document.querySelector('.sb-dash-hero-title span, .sb-dash-hero-user-name');
        if (heroName) {
            heroName.textContent = `${firstName}!`;
        }
    }

    // Apply immediate local state if present
    if (userProfile) {
        applyProfileToDOM(userProfile);
    }

    // Asynchronously fetch authoritative source of truth from backend
    try {
        const res = await fetch('/api/user/me');
        if (res.ok) {
            const json = await res.json();
            if (json.success && json.user) {
                userProfile = json.user;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
                applyProfileToDOM(userProfile);
            }
        }
    } catch (err) {
        // Offline or preview fallback
    }
}

/**
 * One-Click Logout Handler
 * Cleans up local/session browser state on logout form submission.
 */
function initLogoutHandlers() {
    const logoutForms = document.querySelectorAll('#logoutForm, .sb-logout-form');
    logoutForms.forEach(form => {
        form.addEventListener('submit', () => {
            try {
                localStorage.removeItem('sb_user_profile_data');
                sessionStorage.clear();
            } catch (e) {
                // Ignore storage clearance errors
            }
        });
    });
}

// Expose globally for instant cross-component updates
window.syncGlobalUserProfile = syncGlobalUserProfile;
window.initLogoutHandlers = initLogoutHandlers;
