/**
 * SMARTBOOK — GLOBAL ALERT & NOTIFICATION SYSTEM
 * Unified, Accessible, Responsive Notification, Inline Alert & Confirmation Engine
 * Standardized 5-Second Auto-Dismiss with Smooth Transitions & Accessible Controls
 */

(function (window, document) {
    'use strict';

    // Global Standard Auto-Dismiss Duration (5 Seconds)
    const AUTO_DISMISS_DURATION = 5000;

    // SVG / Bootstrap Icon Mappings
    const ICONS = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-octagon-fill',
        danger: 'bi-exclamation-octagon-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };

    const TITLES = {
        success: 'Success',
        error: 'Error',
        danger: 'Error',
        warning: 'Warning',
        info: 'Notice'
    };

    /**
     * Get or create the global toast container
     */
    function getToastContainer() {
        let container = document.getElementById('sb-global-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'sb-global-toast-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Get or create the global confirmation modal
     */
    function getConfirmElements() {
        let backdrop = document.getElementById('sb-confirm-modal');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'sb-confirm-modal';
            backdrop.className = 'sb-confirm-backdrop';
            backdrop.setAttribute('role', 'dialog');
            backdrop.setAttribute('aria-modal', 'true');
            backdrop.setAttribute('aria-hidden', 'true');
            backdrop.innerHTML = `
                <div class="sb-confirm-dialog" role="document">
                    <div class="sb-confirm-header">
                        <div class="sb-confirm-icon-wrap" id="sbConfirmIconWrap">
                            <i class="bi bi-question-circle" id="sbConfirmIcon"></i>
                        </div>
                        <h4 class="sb-confirm-title" id="sbConfirmTitle">Confirm Action</h4>
                    </div>
                    <div class="sb-confirm-message" id="sbConfirmMessage">Are you sure you want to proceed?</div>
                    <div class="sb-confirm-actions">
                        <button type="button" class="sb-confirm-btn sb-confirm-btn-cancel" id="sbConfirmCancelBtn">Cancel</button>
                        <button type="button" class="sb-confirm-btn sb-confirm-btn-primary" id="sbConfirmOkBtn">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);
        }
        return {
            backdrop,
            iconWrap: backdrop.querySelector('#sbConfirmIconWrap'),
            icon: backdrop.querySelector('#sbConfirmIcon'),
            title: backdrop.querySelector('#sbConfirmTitle'),
            message: backdrop.querySelector('#sbConfirmMessage'),
            cancelBtn: backdrop.querySelector('#sbConfirmCancelBtn'),
            okBtn: backdrop.querySelector('#sbConfirmOkBtn')
        };
    }

    /**
     * SmartAlert Core Engine
     */
    const SmartAlert = {
        /**
         * Show a floating toast notification with automatic 5-second dismissal
         * @param {string} message - Message text or HTML
         * @param {string} type - 'success' | 'error' | 'warning' | 'info'
         * @param {string|null} title - Optional title
         * @param {number} duration - Auto-dismiss timeout in ms (default: 5000ms)
         */
        toast(message, type = 'info', title = null, duration = AUTO_DISMISS_DURATION) {
            const normalizedType = (type === 'danger' || type === 'error') ? 'error' : (type || 'info');
            const container = getToastContainer();

            // Enforce 5000ms default if null or undefined
            if (duration === null || duration === undefined) {
                duration = AUTO_DISMISS_DURATION;
            }

            const toast = document.createElement('div');
            toast.className = `sb-toast sb-toast-${normalizedType}`;
            toast.setAttribute('role', normalizedType === 'error' ? 'alert' : 'status');

            const iconClass = ICONS[normalizedType] || ICONS.info;
            const displayTitle = title ? `<div class="sb-toast-title">${title}</div>` : '';

            toast.innerHTML = `
                <div class="sb-toast-icon-wrap">
                    <i class="bi ${iconClass}"></i>
                </div>
                <div class="sb-toast-content">
                    ${displayTitle}
                    <p class="sb-toast-message">${message}</p>
                </div>
                <button type="button" class="sb-toast-close" aria-label="Close notification" title="Close">
                    <i class="bi bi-x-lg"></i>
                </button>
                ${duration > 0 ? '<div class="sb-toast-progress"><div class="sb-toast-progress-bar"></div></div>' : ''}
            `;

            container.appendChild(toast);

            // Trigger entrance animation
            requestAnimationFrame(() => {
                toast.classList.add('sb-toast-visible');
            });

            let dismissTimer = null;
            let remainingTime = duration;
            let startTime = Date.now();
            let progressBar = toast.querySelector('.sb-toast-progress-bar');

            const startTimer = () => {
                if (duration > 0 && remainingTime > 0) {
                    startTime = Date.now();
                    if (progressBar) {
                        progressBar.style.transition = `transform ${remainingTime}ms linear`;
                        progressBar.style.transform = 'scaleX(0)';
                    }
                    dismissTimer = setTimeout(() => {
                        SmartAlert.dismissToast(toast);
                    }, remainingTime);
                }
            };

            const pauseTimer = () => {
                if (dismissTimer) {
                    clearTimeout(dismissTimer);
                    dismissTimer = null;
                }
                const elapsed = Date.now() - startTime;
                remainingTime = Math.max(0, remainingTime - elapsed);

                if (progressBar) {
                    const computedStyle = window.getComputedStyle(progressBar);
                    const matrix = new WebKitCSSMatrix(computedStyle.transform);
                    progressBar.style.transition = 'none';
                    progressBar.style.transform = `scaleX(${matrix.a || 1})`;
                }
            };

            // Pause countdown on hover, resume on mouse leave
            toast.addEventListener('mouseenter', pauseTimer);
            toast.addEventListener('mouseleave', startTimer);

            // Close button listener
            const closeBtn = toast.querySelector('.sb-toast-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (dismissTimer) clearTimeout(dismissTimer);
                    SmartAlert.dismissToast(toast);
                });
            }

            startTimer();
            return toast;
        },

        /**
         * Dismiss a specific toast element with smooth animation
         */
        dismissToast(toast) {
            if (!toast || toast.classList.contains('sb-toast-hiding')) return;
            toast.classList.remove('sb-toast-visible');
            toast.classList.add('sb-toast-hiding');
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 350);
        },

        /**
         * Shortcut Helpers (5-Second Default)
         */
        success(message, title = null, duration = AUTO_DISMISS_DURATION) {
            return SmartAlert.toast(message, 'success', title, duration);
        },

        error(message, title = null, duration = AUTO_DISMISS_DURATION) {
            return SmartAlert.toast(message, 'error', title, duration);
        },

        warning(message, title = null, duration = AUTO_DISMISS_DURATION) {
            return SmartAlert.toast(message, 'warning', title, duration);
        },

        info(message, title = null, duration = AUTO_DISMISS_DURATION) {
            return SmartAlert.toast(message, 'info', title, duration);
        },

        /**
         * Show an accessible confirmation dialog (Non-auto-dismissing, requires explicit user response)
         * @param {Object} options
         * @param {string} options.title - Header title
         * @param {string} options.message - Body text
         * @param {string} options.confirmText - Confirm button text (default: 'Confirm')
         * @param {string} options.cancelText - Cancel button text (default: 'Cancel')
         * @param {string} options.type - 'primary' | 'danger' | 'warning'
         * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
         */
        confirm(options = {}) {
            return new Promise((resolve) => {
                const {
                    title = 'Confirm Action',
                    message = 'Are you sure you want to proceed?',
                    confirmText = 'Confirm',
                    cancelText = 'Cancel',
                    type = 'primary'
                } = options;

                const { backdrop, iconWrap, icon, title: titleEl, message: messageEl, cancelBtn, okBtn } = getConfirmElements();

                // Setup Content
                titleEl.textContent = title;
                messageEl.textContent = message;
                cancelBtn.textContent = cancelText;
                okBtn.textContent = confirmText;

                // Setup Styling Variants
                iconWrap.className = 'sb-confirm-icon-wrap';
                okBtn.className = 'sb-confirm-btn';

                if (type === 'danger') {
                    iconWrap.classList.add('sb-confirm-icon-danger');
                    icon.className = 'bi bi-trash3-fill';
                    okBtn.classList.add('sb-confirm-btn-danger');
                } else if (type === 'warning') {
                    iconWrap.classList.add('sb-confirm-icon-warning');
                    icon.className = 'bi bi-exclamation-triangle-fill';
                    okBtn.classList.add('sb-confirm-btn-primary');
                } else {
                    iconWrap.classList.add('sb-confirm-icon-primary');
                    icon.className = 'bi bi-question-circle-fill';
                    okBtn.classList.add('sb-confirm-btn-primary');
                }

                // Show Modal
                backdrop.classList.add('sb-confirm-open');
                backdrop.setAttribute('aria-hidden', 'false');
                okBtn.focus();

                // Clean-up handler
                function cleanup(result) {
                    backdrop.classList.remove('sb-confirm-open');
                    backdrop.setAttribute('aria-hidden', 'true');
                    document.removeEventListener('keydown', handleKey);
                    okBtn.onclick = null;
                    cancelBtn.onclick = null;
                    backdrop.onclick = null;
                    resolve(result);
                }

                function handleKey(e) {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        cleanup(false);
                    } else if (e.key === 'Enter' && document.activeElement === okBtn) {
                        e.preventDefault();
                        cleanup(true);
                    }
                }

                okBtn.onclick = () => cleanup(true);
                cancelBtn.onclick = () => cleanup(false);
                backdrop.onclick = (e) => {
                    if (e.target === backdrop) cleanup(false);
                };
                document.addEventListener('keydown', handleKey);
            });
        },

        /**
         * Render or attach inline alert in a specific container with 5s auto-dismiss
         */
        inline(options = {}) {
            const {
                container,
                message,
                type = 'info',
                title = null,
                dismissible = true,
                autoDismiss = true,
                duration = AUTO_DISMISS_DURATION
            } = options;

            if (!container) return null;
            const normalizedType = (type === 'danger' || type === 'error') ? 'danger' : type;
            const alertEl = document.createElement('div');
            alertEl.className = `sb-alert sb-alert-${normalizedType} ${dismissible ? 'sb-alert-dismissible' : ''}`;
            alertEl.setAttribute('role', normalizedType === 'danger' ? 'alert' : 'status');

            const iconClass = ICONS[normalizedType] || ICONS.info;
            const titleHtml = title ? `<h5 class="sb-alert-title">${title}</h5>` : '';
            const closeHtml = dismissible ? `
                <button type="button" class="sb-alert-close" aria-label="Close alert" title="Close">
                    <i class="bi bi-x-lg"></i>
                </button>
            ` : '';

            alertEl.innerHTML = `
                <div class="sb-alert-icon-wrap">
                    <i class="bi ${iconClass}"></i>
                </div>
                <div class="sb-alert-content">
                    ${titleHtml}
                    <div class="sb-alert-message">${message}</div>
                </div>
                ${closeHtml}
            `;

            container.prepend(alertEl);

            if (dismissible) {
                const closeBtn = alertEl.querySelector('.sb-alert-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        SmartAlert.dismissInline(alertEl);
                    });
                }
            }

            if (autoDismiss !== false && duration > 0) {
                SmartAlert.scheduleAlertDismiss(alertEl, duration);
            }

            return alertEl;
        },

        /**
         * Schedule automatic 5-second dismissal for an inline or flash alert element
         * @param {HTMLElement} alertEl - The .sb-alert DOM element
         * @param {number} duration - Milliseconds until auto-dismiss (default: 5000ms)
         */
        scheduleAlertDismiss(alertEl, duration = AUTO_DISMISS_DURATION) {
            if (!alertEl || alertEl._sbDismissScheduled) return;

            // Check if explicitly marked persistent
            if (alertEl.dataset.autoDismiss === 'false' || alertEl.classList.contains('sb-alert-persistent')) {
                return;
            }

            alertEl._sbDismissScheduled = true;
            let remainingTime = duration;
            let startTime = Date.now();
            let timerId = null;

            const startTimer = () => {
                if (remainingTime > 0) {
                    startTime = Date.now();
                    timerId = setTimeout(() => {
                        SmartAlert.dismissInline(alertEl);
                    }, remainingTime);
                    alertEl._sbDismissTimer = timerId;
                }
            };

            const pauseTimer = () => {
                if (timerId) {
                    clearTimeout(timerId);
                    timerId = null;
                    alertEl._sbDismissTimer = null;
                }
                const elapsed = Date.now() - startTime;
                remainingTime = Math.max(0, remainingTime - elapsed);
            };

            // Pause on hover, resume when mouse leaves
            alertEl.addEventListener('mouseenter', pauseTimer);
            alertEl.addEventListener('mouseleave', startTimer);

            startTimer();
        },

        /**
         * Smoothly dismiss an inline or flash alert with upward slide & height collapse
         * @param {HTMLElement} alertEl - The .sb-alert DOM element
         */
        dismissInline(alertEl) {
            if (!alertEl || alertEl.classList.contains('sb-alert-hiding')) return;

            // Clear any active dismiss timer
            if (alertEl._sbDismissTimer) {
                clearTimeout(alertEl._sbDismissTimer);
                alertEl._sbDismissTimer = null;
            }

            // Lock current height for seamless CSS max-height transition
            const currentHeight = alertEl.offsetHeight;
            alertEl.style.maxHeight = currentHeight + 'px';

            requestAnimationFrame(() => {
                alertEl.classList.add('sb-alert-hiding');
            });

            setTimeout(() => {
                const parent = alertEl.parentNode;
                if (alertEl && parent) {
                    parent.removeChild(alertEl);
                    // If parent flash container is now empty, clean it up
                    if (parent.classList.contains('sb-flash-container') && parent.children.length === 0) {
                        parent.style.display = 'none';
                    }
                }
            }, 360);
        },

        /**
         * Initialize all rendered .sb-alert elements and bind auto-dismiss
         */
        initPageAlerts() {
            // Bind existing page alerts
            document.querySelectorAll('.sb-alert').forEach(alertEl => {
                // Bind close button
                const closeBtn = alertEl.querySelector('.sb-alert-close');
                if (closeBtn && !closeBtn._sbCloseBound) {
                    closeBtn._sbCloseBound = true;
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        SmartAlert.dismissInline(alertEl);
                    });
                }

                // Schedule auto-dismiss (5 seconds)
                SmartAlert.scheduleAlertDismiss(alertEl, AUTO_DISMISS_DURATION);
            });

            // Bind top navigation notification bell icon
            document.querySelectorAll('.sb-dash-notify-btn').forEach(btn => {
                if (!btn._sbNotifyBound) {
                    btn._sbNotifyBound = true;
                    btn.addEventListener('click', () => {
                        SmartAlert.info('You have no new unread notifications.', 'Notifications');
                    });
                }
            });
        },

        /**
         * Setup dynamic observer for any newly inserted alerts
         */
        setupObserver() {
            if (window._sbAlertObserverActive) return;
            window._sbAlertObserverActive = true;

            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList && node.classList.contains('sb-alert')) {
                                const closeBtn = node.querySelector('.sb-alert-close');
                                if (closeBtn && !closeBtn._sbCloseBound) {
                                    closeBtn._sbCloseBound = true;
                                    closeBtn.addEventListener('click', (e) => {
                                        e.stopPropagation();
                                        SmartAlert.dismissInline(node);
                                    });
                                }
                                SmartAlert.scheduleAlertDismiss(node, AUTO_DISMISS_DURATION);
                            } else if (node.querySelectorAll) {
                                node.querySelectorAll('.sb-alert').forEach(alertEl => {
                                    const closeBtn = alertEl.querySelector('.sb-alert-close');
                                    if (closeBtn && !closeBtn._sbCloseBound) {
                                        closeBtn._sbCloseBound = true;
                                        closeBtn.addEventListener('click', (e) => {
                                            e.stopPropagation();
                                            SmartAlert.dismissInline(alertEl);
                                        });
                                    }
                                    SmartAlert.scheduleAlertDismiss(alertEl, AUTO_DISMISS_DURATION);
                                });
                            }
                        }
                    });
                });
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }
    };

    // Initialize on DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            SmartAlert.initPageAlerts();
            SmartAlert.setupObserver();
        });
    } else {
        SmartAlert.initPageAlerts();
        SmartAlert.setupObserver();
    }

    // Expose to global window scope
    window.SmartAlert = SmartAlert;

    // Backward compatibility with legacy showToast(message, type)
    window.showToast = function (message, type = 'info') {
        return SmartAlert.toast(message, type, null, AUTO_DISMISS_DURATION);
    };

})(window, document);
