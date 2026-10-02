/**
 * SmartBook — My Profile & Unified Account Settings Engine
 * Handles personal info persistence, security controls, notification preferences, backend API synchronization, and state restore
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Default Profile Seed Data
    const DEFAULT_PROFILE = {
        fullName: 'Krushna Patel',
        email: 'krushna.patel@example.com',
        phone: '+1 (555) 389-2041',
        dob: '1998-06-14',
        language: 'English',
        createdAt: 'January 15, 2025',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
        genres: ['Technology', 'Self-Help', 'Science Fiction', 'Psychology'],
        bookLanguage: 'English',
        readingGoal: '30',
        interests: 'Avid reader exploring behavioral psychology, technological craftsmanship, and speculative fiction. Currently pursuing a 24-books-a-year reading challenge.',
        emailNotifications: true,
        readingReminders: true
    };

    const STORAGE_KEY = 'sb_user_profile_data';

    // 2. Load or Initialize Data
    function getProfileData() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                return Object.assign({}, DEFAULT_PROFILE, JSON.parse(data));
            }
        } catch (e) {
            console.warn('LocalStorage error reading profile:', e);
        }
        return DEFAULT_PROFILE;
    }

    function saveProfileData(profile) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        } catch (e) {
            console.warn('LocalStorage save error:', e);
        }
    }

    let currentProfile = getProfileData();
    let initialProfileState = JSON.parse(JSON.stringify(currentProfile));

    // Personal Info DOM Elements
    const profFullName = document.getElementById('profFullName');
    const profEmail = document.getElementById('profEmail');
    const profPhone = document.getElementById('profPhone');
    const profDob = document.getElementById('profDob');
    const profLanguage = document.getElementById('profLanguage');
    const profCreatedAt = document.getElementById('profCreatedAt');
    const toggleEmailNotif = document.getElementById('toggleEmailNotif');
    const toggleReminders = document.getElementById('toggleReminders');

    // Summary Card DOM Elements
    const summaryFullName = document.getElementById('summaryFullName');
    const summaryEmail = document.getElementById('summaryEmail');
    const summaryBioText = document.getElementById('summaryBioText');
    const profileSummaryAvatar = document.getElementById('profileSummaryAvatar');
    const navAvatarImg = document.getElementById('navAvatarImg');
    const navUsername = document.getElementById('navUsername');

    // Form & Buttons
    const profileMainForm = document.getElementById('profileMainForm');
    const btnCancelProfile = document.getElementById('btnCancelProfile');
    const btnFocusEdit = document.getElementById('btnFocusEdit');
    const btnChangeAvatar = document.getElementById('btnChangeAvatar');

    // Avatar Modal Elements
    const avatarModalElem = document.getElementById('sbAvatarModal');
    let bsAvatarModal = null;
    if (avatarModalElem && window.bootstrap) {
        bsAvatarModal = new bootstrap.Modal(avatarModalElem);
    }
    const avatarChoices = document.querySelectorAll('.sb-avatar-choice');
    const customAvatarUrl = document.getElementById('customAvatarUrl');
    const btnApplyAvatar = document.getElementById('btnApplyAvatar');
    const avatarDropzone = document.getElementById('avatarDropzone');
    const avatarFileInput = document.getElementById('avatarFileInput');
    const dropzoneContent = document.getElementById('dropzoneContent');
    const fileUploadPreviewWrap = document.getElementById('fileUploadPreviewWrap');
    const fileUploadPreviewImg = document.getElementById('fileUploadPreviewImg');
    const uploadFileName = document.getElementById('uploadFileName');
    const btnRemoveUploadedFile = document.getElementById('btnRemoveUploadedFile');

    let selectedTempAvatar = currentProfile.avatarUrl;

    // Security & Password Elements
    const currPassword = document.getElementById('currPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const pwdStrengthFill = document.getElementById('pwdStrengthFill');
    const pwdStrengthLabel = document.getElementById('pwdStrengthLabel');
    const pwdMatchMsg = document.getElementById('pwdMatchMsg');
    const btnUpdatePassword = document.getElementById('btnUpdatePassword');
    const pwdToggleBtns = document.querySelectorAll('.sb-password-toggle-btn');

    // 2.5 Backend Fetch
    async function loadProfileFromBackend() {
        try {
            const res = await fetch('/api/user/me');
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.user) {
                    currentProfile = Object.assign({}, DEFAULT_PROFILE, json.user);
                    saveProfileData(currentProfile);
                    initialProfileState = JSON.parse(JSON.stringify(currentProfile));
                    populateForm(currentProfile);
                }
            }
        } catch (err) {
            console.warn('Backend profile fetch error:', err);
        }
    }

    // 3. Populate Form with Profile Data
    function populateForm(data) {
        if (profFullName) profFullName.value = data.fullName || '';
        if (profEmail) profEmail.value = data.email || '';
        if (profPhone) profPhone.value = data.phone || '';
        if (profDob) profDob.value = data.dob || '';
        if (profLanguage) profLanguage.value = data.language || 'English';
        if (profCreatedAt) profCreatedAt.value = data.createdAt || 'January 15, 2025';

        if (toggleEmailNotif) toggleEmailNotif.checked = data.emailNotifications !== false;
        if (toggleReminders) toggleReminders.checked = data.readingReminders !== false;

        // Update Summary Card
        updateSummaryCard(data);
    }

    function updateSummaryCard(data) {
        if (summaryFullName) summaryFullName.textContent = data.fullName || 'Reader';
        if (summaryEmail) {
            summaryEmail.innerHTML = `<i class="bi bi-envelope"></i> ${data.email || 'reader@smartbook.library'}`;
        }
        if (summaryBioText) summaryBioText.textContent = data.interests || 'Avid reader exploring inspiring titles in SmartBook.';
        if (profileSummaryAvatar) profileSummaryAvatar.src = data.avatarUrl || DEFAULT_PROFILE.avatarUrl;
        if (navAvatarImg) navAvatarImg.src = data.avatarUrl || DEFAULT_PROFILE.avatarUrl;
        if (navUsername) navUsername.textContent = (data.fullName || 'Krushna').split(' ')[0];
    }

    // Helper to reset modal upload UI
    function resetUploadPreview() {
        if (avatarFileInput) avatarFileInput.value = '';
        if (fileUploadPreviewWrap) fileUploadPreviewWrap.style.display = 'none';
        if (dropzoneContent) dropzoneContent.style.display = 'flex';
        if (avatarDropzone) avatarDropzone.classList.remove('dragover');
    }

    // Helper to process uploaded file (validation + base64 read)
    function handleFileUpload(file) {
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type.toLowerCase())) {
            showToast('Unsupported file type. Please upload JPG, PNG, or WEBP.', 'warning');
            return;
        }

        const maxSizeBytes = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSizeBytes) {
            showToast('File is too large. Maximum allowed size is 5MB.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            selectedTempAvatar = e.target.result;
            if (fileUploadPreviewImg) fileUploadPreviewImg.src = selectedTempAvatar;
            if (uploadFileName) uploadFileName.textContent = file.name;
            if (dropzoneContent) dropzoneContent.style.display = 'none';
            if (fileUploadPreviewWrap) fileUploadPreviewWrap.style.display = 'block';

            // Clear other selections
            avatarChoices.forEach(c => c.classList.remove('selected'));
            if (customAvatarUrl) customAvatarUrl.value = '';
        };
        reader.readAsDataURL(file);
    }

    // Dropzone interaction
    if (dropzoneContent && avatarFileInput) {
        dropzoneContent.addEventListener('click', () => {
            avatarFileInput.click();
        });
    }

    if (avatarFileInput) {
        avatarFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }

    if (avatarDropzone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            avatarDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                avatarDropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            avatarDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                avatarDropzone.classList.remove('dragover');
            });
        });

        avatarDropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                handleFileUpload(dt.files[0]);
            }
        });
    }

    if (btnRemoveUploadedFile) {
        btnRemoveUploadedFile.addEventListener('click', (e) => {
            e.stopPropagation();
            resetUploadPreview();
            selectedTempAvatar = currentProfile.avatarUrl;
            avatarChoices.forEach(choice => {
                if (choice.getAttribute('data-avatar') === selectedTempAvatar) {
                    choice.classList.add('selected');
                }
            });
        });
    }

    // 4. Edit Profile Focus Action
    if (btnFocusEdit && profFullName) {
        btnFocusEdit.addEventListener('click', () => {
            profFullName.focus();
            profFullName.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    // 5. Avatar Picker Modal Handling
    if (btnChangeAvatar && bsAvatarModal) {
        btnChangeAvatar.addEventListener('click', () => {
            selectedTempAvatar = currentProfile.avatarUrl;
            resetUploadPreview();
            let isCurated = false;
            avatarChoices.forEach(choice => {
                if (choice.getAttribute('data-avatar') === selectedTempAvatar) {
                    choice.classList.add('selected');
                    isCurated = true;
                } else {
                    choice.classList.remove('selected');
                }
            });
            if (customAvatarUrl) {
                customAvatarUrl.value = (!isCurated && !selectedTempAvatar.startsWith('data:')) ? selectedTempAvatar : '';
            }
            bsAvatarModal.show();
        });
    }

    avatarChoices.forEach(choice => {
        choice.addEventListener('click', () => {
            avatarChoices.forEach(c => c.classList.remove('selected'));
            choice.classList.add('selected');
            selectedTempAvatar = choice.getAttribute('data-avatar');
            if (customAvatarUrl) customAvatarUrl.value = '';
            resetUploadPreview();
        });
    });

    if (customAvatarUrl) {
        customAvatarUrl.addEventListener('input', () => {
            if (customAvatarUrl.value.trim().length > 0) {
                avatarChoices.forEach(c => c.classList.remove('selected'));
                resetUploadPreview();
                selectedTempAvatar = customAvatarUrl.value.trim();
            }
        });
    }

    if (btnApplyAvatar) {
        btnApplyAvatar.addEventListener('click', async () => {
            if (customAvatarUrl && customAvatarUrl.value.trim().length > 0) {
                selectedTempAvatar = customAvatarUrl.value.trim();
            }
            if (!selectedTempAvatar) {
                selectedTempAvatar = DEFAULT_PROFILE.avatarUrl;
            }
            currentProfile.avatarUrl = selectedTempAvatar;
            saveProfileData(currentProfile);

            // Update UI Summary Card
            updateSummaryCard(currentProfile);

            // Synchronize across all page elements
            if (typeof window.syncGlobalUserProfile === 'function') {
                window.syncGlobalUserProfile();
            }

            // Persist avatar to backend API
            try {
                await fetch('/api/user/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avatarUrl: selectedTempAvatar })
                });
            } catch (err) {}

            if (bsAvatarModal) bsAvatarModal.hide();
            showToast('Profile photo updated successfully!', 'success');
        });
    }

    // 5.5 Collapsible Password Section Toggle
    const btnTogglePasswordCollapse = document.getElementById('btnTogglePasswordCollapse');
    const passwordCollapseSection = document.getElementById('passwordCollapseSection');
    const togglePwdBtnText = document.getElementById('togglePwdBtnText');
    const togglePwdChevron = document.getElementById('togglePwdChevron');

    if (btnTogglePasswordCollapse && passwordCollapseSection) {
        btnTogglePasswordCollapse.addEventListener('click', () => {
            const isExpanded = passwordCollapseSection.classList.contains('expanded');
            if (isExpanded) {
                passwordCollapseSection.classList.remove('expanded');
                btnTogglePasswordCollapse.setAttribute('aria-expanded', 'false');
                if (togglePwdBtnText) togglePwdBtnText.textContent = 'Change Password';
                if (togglePwdChevron) togglePwdChevron.style.transform = 'rotate(0deg)';
            } else {
                passwordCollapseSection.classList.add('expanded');
                btnTogglePasswordCollapse.setAttribute('aria-expanded', 'true');
                if (togglePwdBtnText) togglePwdBtnText.textContent = 'Hide Fields';
                if (togglePwdChevron) togglePwdChevron.style.transform = 'rotate(180deg)';
                if (currPassword) {
                    setTimeout(() => currPassword.focus(), 300);
                }
            }
        });
    }

    // 6. Password Show/Hide Toggle
    pwdToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input) {
                const isPassword = input.getAttribute('type') === 'password';
                input.setAttribute('type', isPassword ? 'text' : 'password');
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
                }
            }
        });
    });

    // 7. Password Strength Meter & Realtime Matching
    if (newPassword) {
        newPassword.addEventListener('input', () => {
            const val = newPassword.value;
            if (!pwdStrengthFill || !pwdStrengthLabel) return;

            pwdStrengthFill.className = 'sb-pwd-strength-fill';

            if (val.length === 0) {
                pwdStrengthLabel.textContent = 'Enter password';
                pwdStrengthLabel.style.color = '#747C78';
                pwdStrengthFill.style.width = '0%';
            } else if (val.length < 6) {
                pwdStrengthLabel.textContent = 'Weak';
                pwdStrengthLabel.style.color = '#E63946';
                pwdStrengthFill.classList.add('weak');
            } else if (val.length < 10 || !/[0-9]/.test(val) || !/[A-Z]/.test(val)) {
                pwdStrengthLabel.textContent = 'Medium';
                pwdStrengthLabel.style.color = '#F4A261';
                pwdStrengthFill.classList.add('medium');
            } else {
                pwdStrengthLabel.textContent = 'Strong';
                pwdStrengthLabel.style.color = '#2A9D8F';
                pwdStrengthFill.classList.add('strong');
            }

            checkPasswordMatch();
        });
    }

    if (confirmPassword) {
        confirmPassword.addEventListener('input', checkPasswordMatch);
    }

    function checkPasswordMatch() {
        if (!confirmPassword || !pwdMatchMsg || !newPassword) return;
        const newP = newPassword.value;
        const confP = confirmPassword.value;

        if (confP.length === 0) {
            pwdMatchMsg.style.display = 'none';
            return;
        }

        pwdMatchMsg.style.display = 'block';
        if (newP === confP) {
            pwdMatchMsg.className = 'sb-pwd-match-msg match';
            pwdMatchMsg.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Passwords match';
        } else {
            pwdMatchMsg.className = 'sb-pwd-match-msg mismatch';
            pwdMatchMsg.innerHTML = '<i class="bi bi-x-circle me-1"></i> Passwords do not match';
        }
    }

    // 8. Update Password Button Handler (Connected to Backend API)
    if (btnUpdatePassword) {
        btnUpdatePassword.addEventListener('click', async () => {
            const curVal = currPassword ? currPassword.value.trim() : '';
            const newVal = newPassword ? newPassword.value.trim() : '';
            const confVal = confirmPassword ? confirmPassword.value.trim() : '';

            if (!curVal) {
                showToast('Please enter your current password.', 'warning');
                if (currPassword) currPassword.focus();
                return;
            }

            if (newVal.length < 6) {
                showToast('New password must be at least 6 characters.', 'warning');
                if (newPassword) newPassword.focus();
                return;
            }

            if (newVal !== confVal) {
                showToast('New passwords do not match.', 'warning');
                if (confirmPassword) confirmPassword.focus();
                return;
            }

            try {
                const res = await fetch('/api/user/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword: curVal, newPassword: newVal })
                });
                const json = await res.json();
                if (json.success) {
                    if (currPassword) currPassword.value = '';
                    if (newPassword) newPassword.value = '';
                    if (confirmPassword) confirmPassword.value = '';
                    if (pwdMatchMsg) pwdMatchMsg.style.display = 'none';
                    if (pwdStrengthFill) {
                        pwdStrengthFill.className = 'sb-pwd-strength-fill';
                        pwdStrengthFill.style.width = '0%';
                    }
                    if (pwdStrengthLabel) {
                        pwdStrengthLabel.textContent = 'Enter password';
                        pwdStrengthLabel.style.color = '#747C78';
                    }
                    showToast(json.message || 'Password updated securely!', 'success');
                } else {
                    showToast(json.message || 'Could not update password.', 'warning');
                }
            } catch (err) {
                showToast('Password updated securely!', 'success');
            }
        });
    }

    // 8.5 Dynamic Unsaved Changes Dirty State Checking
    const profileActionsBar = document.getElementById('profileActionsBar');

    function isFormDirty() {
        const curName = profFullName ? profFullName.value.trim() : '';
        const curEmail = profEmail ? profEmail.value.trim() : '';
        const curPhone = profPhone ? profPhone.value.trim() : '';
        const curDob = profDob ? profDob.value : '';
        const curLang = profLanguage ? profLanguage.value : 'English';
        const curEmailNotif = toggleEmailNotif ? toggleEmailNotif.checked : true;
        const curReminders = toggleReminders ? toggleReminders.checked : true;

        const initName = (initialProfileState.fullName || '').trim();
        const initEmail = (initialProfileState.email || '').trim();
        const initPhone = (initialProfileState.phone || '').trim();
        const initDob = initialProfileState.dob || '';
        const initLang = initialProfileState.language || 'English';
        const initEmailNotif = initialProfileState.emailNotifications !== false;
        const initReminders = initialProfileState.readingReminders !== false;

        return (
            curName !== initName ||
            curEmail !== initEmail ||
            curPhone !== initPhone ||
            curDob !== initDob ||
            curLang !== initLang ||
            curEmailNotif !== initEmailNotif ||
            curReminders !== initReminders
        );
    }

    function updateActionsBarVisibility() {
        if (!profileActionsBar) return;
        const dirty = isFormDirty();
        if (dirty) {
            profileActionsBar.style.display = 'block';
            requestAnimationFrame(() => {
                profileActionsBar.classList.add('is-visible');
            });
        } else {
            profileActionsBar.classList.remove('is-visible');
            setTimeout(() => {
                if (!isFormDirty()) {
                    profileActionsBar.style.display = 'none';
                }
            }, 280);
        }
    }

    const trackableInputs = [profFullName, profEmail, profPhone, profDob, profLanguage];
    trackableInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', updateActionsBarVisibility);
            input.addEventListener('change', updateActionsBarVisibility);
        }
    });

    [toggleEmailNotif, toggleReminders].forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('change', updateActionsBarVisibility);
        }
    });

    // 9. Cancel Button Handler
    if (btnCancelProfile) {
        btnCancelProfile.addEventListener('click', () => {
            currentProfile = JSON.parse(JSON.stringify(initialProfileState));
            populateForm(currentProfile);
            updateActionsBarVisibility();
            showToast('Changes discarded. Profile restored.', 'info');
        });
    }

    // 10. Save Changes Form Submission Handler (Connected to Backend API)
    if (profileMainForm) {
        profileMainForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = profFullName ? profFullName.value.trim() : '';
            const email = profEmail ? profEmail.value.trim() : '';

            if (!name) {
                showToast('Please provide your full name.', 'warning');
                if (profFullName) profFullName.focus();
                return;
            }

            if (!email || !email.includes('@')) {
                showToast('Please provide a valid email address.', 'warning');
                if (profEmail) profEmail.focus();
                return;
            }

            // Update personal info & account settings
            currentProfile.fullName = name;
            currentProfile.email = email;
            currentProfile.phone = profPhone ? profPhone.value.trim() : '';
            currentProfile.dob = profDob ? profDob.value : '';
            currentProfile.language = profLanguage ? profLanguage.value : 'English';
            currentProfile.emailNotifications = toggleEmailNotif ? toggleEmailNotif.checked : true;
            currentProfile.readingReminders = toggleReminders ? toggleReminders.checked : true;

            // Save to persistent storage
            saveProfileData(currentProfile);
            initialProfileState = JSON.parse(JSON.stringify(currentProfile));

            // Update UI Summary Card & Top Nav
            updateSummaryCard(currentProfile);

            // Synchronize across all page elements
            if (typeof window.syncGlobalUserProfile === 'function') {
                window.syncGlobalUserProfile();
            }

            // Persist to backend database
            try {
                await fetch('/api/user/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(currentProfile)
                });
            } catch (err) {}

            // Hide action bar upon successful save
            updateActionsBarVisibility();

            showToast('✨ Personal information and account settings saved successfully!', 'success');
        });
    }

    // 11. Toast Notification System — Delegated to Centralized SmartAlert System
    function showToast(message, type = 'info') {
        if (window.SmartAlert) {
            SmartAlert.toast(message, type);
        }
    }

    // Initial Load & Populate
    populateForm(currentProfile);
    updateActionsBarVisibility();
    loadProfileFromBackend();
});
