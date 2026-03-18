document.addEventListener('DOMContentLoaded', async () => {
    // ---- DOM Elements ----
    const authView = document.getElementById('auth-view');
    const calendarView = document.getElementById('calendar-view');
    const authForm = document.getElementById('auth-form');

    // Auth Tabs
    const tabSignup = document.getElementById('tab-signup');
    const tabLogin = document.getElementById('tab-login');

    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const parentNameGroup = document.getElementById('parent-name-group');
    const childNameGroup = document.getElementById('child-name-group');
    const countryGroup = document.getElementById('country-group');
    const parentNameInput = document.getElementById('parentName');
    const childNameInput = document.getElementById('childName');
    const userCountryInput = document.getElementById('userCountry');
    const userEmailInput = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logout-btn');

    const userTimezoneEl = document.getElementById('user-timezone');
    const daysGrid = document.getElementById('days-grid');
    const currentWeekLabel = document.getElementById('current-week-label');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');

    const bookingModal = document.getElementById('booking-modal');
    const selectedSlotText = document.getElementById('selected-slot-text');
    const cancelBookingBtn = document.getElementById('cancel-booking');
    const confirmBookingBtn = document.getElementById('confirm-booking');

    // Dashboard Elements
    const creditBalanceDisplay = document.getElementById('credit-balance-display');

    const bookingsList = document.getElementById('bookings-list');
    const bookMonthlyCheckbox = document.getElementById('book-monthly-checkbox');
    const confirmCostDisplay = document.getElementById('confirm-cost');
    const monthlyBookingOption = document.getElementById('monthly-booking-option');
    const tenLessonsBookingOption = document.getElementById('ten-lessons-booking-option');
    const bookTenLessonsCheckbox = document.getElementById('book-ten-lessons-checkbox');

    // Top-Up Elements
    const qtyMinusBtn = document.getElementById('qty-minus');
    const qtyPlusBtn = document.getElementById('qty-plus');
    const buyQtyDisplay = document.getElementById('buy-qty');
    const buyTotalPrice = document.getElementById('buy-total-price');
    const buySingleBtn = document.getElementById('buy-single-btn');
    const buyBundleBtn = document.getElementById('buy-bundle-btn');

    // ---- State ----
    let isLoginMode = false;
    let userCredits = 0; // Starting user credits
    let upcomingBookings = []; // Array to hold active bookings
    let pastBookings = []; // Array to hold history/cancelled/amended bookings
    let purchaseQty = 1;
    const PRICE_PER_LESSON = 30;

    let currentWeekStart = new Date();
    // Normalize to start of current week (Monday)
    const day = currentWeekStart.getDay();
    const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart.setDate(diff);
    currentWeekStart.setHours(0, 0, 0, 0);

    let selectedDate = null;
    let allBookedSlots = []; // Array of ISO strings for confirmed bookings
    initEventListeners();
    initAuth();
    detectTimezone();
    fetchAllBookedSlots().then(() => {
        renderCalendar();
    });
    updateDashboard();

    async function fetchAllBookedSlots() {
        try {
            const res = await fetch('/.netlify/functions/public-action', {
                method: 'POST',
                body: JSON.stringify({ action: 'get_booked_slots' })
            });
            const data = await res.json();
            if (data.bookedSlots) {
                allBookedSlots = data.bookedSlots;
            }
        } catch (err) {
            console.error("Failed to fetch all booked slots", err);
        }
    }

    // ---- Session Check ----
    supabase.auth.getSession().then(async ({ data, error }) => {

        const session = data?.session;
        if (!session || error) {
            console.log("No active session found. Showing login view.");
            if (authView) {
                authView.classList.remove('hidden');
                authView.style.display = 'block';
            }
            return;
        }

        try {
            // We have a session, start loading the dashboard securely
            let { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            let credits = 0;
            let parentName = "Parent";

            if (!profile) {
                const pendingProfileStr = localStorage.getItem('pending_signup_profile');
                let pData = { parent_name: 'Parent', child_name: '', country: '' };
                if (pendingProfileStr) {
                    try { pData = JSON.parse(pendingProfileStr); } catch (e) { }
                }

                const { error: insertError } = await supabase.from('profiles').insert([{
                    id: session.user.id,
                    email: session.user.email,
                    parent_name: pData.parent_name,
                    child_name: pData.child_name,
                    country: pData.country,
                    credits: 0
                }]);

                if (!insertError) {
                    localStorage.removeItem('pending_signup_profile');
                    parentName = pData.parent_name;
                }
            } else {
                credits = profile.credits || 0;
                parentName = profile.parent_name || "Parent";
            }

            // ---- Process Stripe Return ----
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('session_id');

            if (sessionId) {
                const consumedKey = `stripe_consumed_${sessionId}`;
                if (!localStorage.getItem(consumedKey)) {
                    authSubmitBtn.textContent = 'Verifying Payment...';
                    try {
                        const res = await fetch('/.netlify/functions/public-action', {
                            method: 'POST',
                            body: JSON.stringify({ action: 'verify_checkout', payload: { sessionId } })
                        });
                        const data = await res.json();
                        
                        if (data.status === 'paid' || data.status === 'complete') {
                            const creditsAdded = parseInt(data.creditsToAdd || 0, 10);
                            if (creditsAdded > 0) {
                                credits += creditsAdded;
                                await supabase.from('profiles').update({ credits }).eq('id', session.user.id);
                                localStorage.setItem(consumedKey, 'true');
                                alert(`Success! ${creditsAdded} credits have been added to your account.`);
                            }
                        }
                    } catch (e) {
                        console.error('Failed to verify payment session', e);
                    }
                }
                
                // Keep URL clean
                window.history.replaceState({}, document.title, window.location.pathname);
                authSubmitBtn.textContent = 'Log In';
            }

            loginSuccess(session.user.email, parentName, credits);
        } catch (err) {
            console.error("Critical error during session load:", err);
            if (authView) {
                authView.classList.remove('hidden');
                authView.style.display = 'block';
            }
        }
    });

    // ---- Auth Logic ----
    function initAuth() {
        tabLogin.addEventListener('click', () => {
            isLoginMode = true;
            tabLogin.classList.add('active');
            tabSignup.classList.remove('active');

            authSubmitBtn.textContent = 'Log In';
            parentNameGroup.style.display = 'none';
            childNameGroup.style.display = 'none';
            countryGroup.style.display = 'none';
            parentNameInput.removeAttribute('required');
            childNameInput.removeAttribute('required');
            userCountryInput.removeAttribute('required');
            document.getElementById('forgot-password-container').style.display = 'block';
            if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'none';
            if (confirmPasswordInput) confirmPasswordInput.removeAttribute('required');
            const authStatusMsg = document.getElementById('auth-status');
            if (authStatusMsg) authStatusMsg.textContent = '';
        });

        tabSignup.addEventListener('click', () => {
            isLoginMode = false;
            tabSignup.classList.add('active');
            tabLogin.classList.remove('active');

            authSubmitBtn.textContent = 'Create Account';
            parentNameGroup.style.display = 'block';
            childNameGroup.style.display = 'block';
            countryGroup.style.display = 'block';
            parentNameInput.setAttribute('required', 'true');
            childNameInput.setAttribute('required', 'true');
            userCountryInput.setAttribute('required', 'true');
            document.getElementById('forgot-password-container').style.display = 'none';
            if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'block';
            if (confirmPasswordInput) confirmPasswordInput.setAttribute('required', 'true');
            const authStatusMsg = document.getElementById('auth-status');
            if (authStatusMsg) authStatusMsg.textContent = '';
        });

        // Auth State Variables
        let failedLoginAttempts = 0;

        const authStatusMsg = document.getElementById('auth-status');
        const forgotPasswordContainer = document.getElementById('forgot-password-container');
        const forgotPasswordBtn = document.getElementById('forgot-password-btn');
        const resetSuccessMsg = document.getElementById('reset-success-msg');
        const userPasswordInput = document.getElementById('userPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const confirmPasswordGroup = document.getElementById('confirm-password-group');
        const showPasswordToggle = document.getElementById('show-password-toggle');

        if (showPasswordToggle) {
            showPasswordToggle.addEventListener('change', (e) => {
                const type = e.target.checked ? 'text' : 'password';
                if (userPasswordInput) userPasswordInput.type = type;
                if (confirmPasswordInput) confirmPasswordInput.type = type;
            });
        }

        // Handle Submission
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Reset messages
            authStatusMsg.textContent = '';
            resetSuccessMsg.style.display = 'none';

            const btnOriginalText = authSubmitBtn.textContent;
            authSubmitBtn.textContent = 'Processing...';
            // Disable button during processing
            authSubmitBtn.disabled = true;

            const email = userEmailInput.value.trim().toLowerCase();
            const password = userPasswordInput.value;

            if (!isLoginMode) {
                // SIGNUP LOGIC
                if (password !== confirmPasswordInput.value) {
                    authStatusMsg.textContent = "Passwords do not match. Please try again.";
                    authSubmitBtn.textContent = btnOriginalText;
                    authSubmitBtn.disabled = false;
                    return;
                }

                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        emailRedirectTo: window.location.origin + '/booking.html'
                    }
                });

                if (error) {
                    authStatusMsg.textContent = error.message;
                    authSubmitBtn.textContent = btnOriginalText;
                    authSubmitBtn.disabled = false;
                    return;
                }

                if (data.session) {
                    // Profile creation with valid session
                    const { error: profileError } = await supabase.from('profiles').insert([
                        {
                            id: data.user.id,
                            email: email,
                            parent_name: parentNameInput.value,
                            child_name: childNameInput.value,
                            country: userCountryInput.value,
                            credits: 0
                        }
                    ]);

                    if (profileError) {
                        console.error('Error creating profile:', profileError);
                        alert("There was an error creating your profile in the database. Please contact the administrator.");
                    }

                    await loginSuccess(email, parentNameInput.value, 0);
                } else if (data.user) {
                    // Supabase requires email confirmation
                    localStorage.setItem('pending_signup_profile', JSON.stringify({
                        parent_name: parentNameInput.value,
                        child_name: childNameInput.value,
                        country: userCountryInput.value
                    }));

                    authStatusMsg.innerHTML = "<strong>Success, but hold on!</strong><br/>Please check your email and click the confirmation link before logging in.";
                    authSubmitBtn.textContent = btnOriginalText;
                    authSubmitBtn.disabled = false;
                    return;
                }

            } else {
                // LOGIN LOGIC
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    failedLoginAttempts++;
                    authStatusMsg.textContent = error.message || "Incorrect email or password. Please try again.";
                    authSubmitBtn.textContent = btnOriginalText;
                    authSubmitBtn.disabled = false;

                    // 3-Strike Logic for Forgot Password
                    if (failedLoginAttempts >= 3 && isLoginMode) {
                        forgotPasswordContainer.style.display = 'block';
                    }
                    return;
                }

                // Successful Login
                failedLoginAttempts = 0; // reset attempts
                forgotPasswordContainer.style.display = 'none';

                // Fetch profile to get name and credits
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                let credits = 0;
                let parentName = "Parent";

                if (!profile) {
                    const pendingProfileStr = localStorage.getItem('pending_signup_profile');
                    let pData = { parent_name: 'Parent', child_name: '', country: '' };
                    if (pendingProfileStr) {
                        try {
                            pData = JSON.parse(pendingProfileStr);
                        } catch (e) { console.error(e); }
                    }

                    const { error: insertError } = await supabase.from('profiles').insert([
                        {
                            id: data.user.id,
                            email: email,
                            parent_name: pData.parent_name,
                            child_name: pData.child_name,
                            country: pData.country,
                            credits: 0
                        }
                    ]);

                    if (!insertError) {
                        localStorage.removeItem('pending_signup_profile');
                        parentName = pData.parent_name;
                    } else {
                        console.error('Error creating profile on login:', insertError);
                    }
                } else {
                    credits = profile.credits || 0;
                    parentName = profile.parent_name || "Parent";
                }

                await loginSuccess(email, parentName, credits);
            }

            // Re-enable button
            authSubmitBtn.disabled = false;
        });

        // Handle Forgot Password Click
        if (forgotPasswordBtn) {
            forgotPasswordBtn.addEventListener('click', async () => {
                const email = userEmailInput.value.trim().toLowerCase();
                if (!email) {
                    authStatusMsg.textContent = "Please enter your email to reset your password.";
                    return;
                }

                const btnOriginalText = forgotPasswordBtn.textContent;
                forgotPasswordBtn.textContent = 'Sending...';

                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/reset-password.html',
                });

                forgotPasswordBtn.textContent = btnOriginalText;

                if (error) {
                    authStatusMsg.textContent = error.message;
                } else {
                    resetSuccessMsg.style.display = 'block';
                    authStatusMsg.textContent = '';
                }
            });
        }

        // Logout moved outside if needed, but it's fine here as it's just an event listener.

        // Logout
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();

            calendarView.classList.add('hidden');
            calendarView.style.display = 'none';
            authView.classList.remove('hidden');
            authView.style.display = 'block';
            authForm.reset();

            const hiddenNameInput = document.getElementById('portal-name-hidden');
            if (hiddenNameInput) {
                hiddenNameInput.value = "Unknown Client";
            }
        });
    }

    function loginSuccess(email, name, credits) {
        // Set the hidden field value for the contact form
        const hiddenNameInput = document.getElementById('portal-name-hidden');
        if (hiddenNameInput) {
            hiddenNameInput.value = name;
        }

        // Set credits instantly
        userCredits = credits || 0;
        updateDashboard();

        // Transition UI IMPMEDIATELY so it feels fast
        if (authView) {
            authView.classList.add('hidden');
            authView.style.display = 'none';
        }
        if (calendarView) {
            calendarView.classList.remove('hidden');
            calendarView.style.display = 'block';
        }
        if (authSubmitBtn) authSubmitBtn.textContent = 'Log In';
        if (authForm) authForm.reset();
        const forgotContainer = document.getElementById('forgot-password-container');
        const resetMsg = document.getElementById('reset-success-msg');
        if (forgotContainer) forgotContainer.style.display = 'none';
        if (resetMsg) resetMsg.style.display = 'none';

        // Fetch bookings and messages in the background
        supabase.auth.getSession().then(async ({ data }) => {
            const session = data?.session;
            if (session) {
                const { data: bookings } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('booking_date', { ascending: true });

                if (bookings) {
                    const now = new Date();
                    upcomingBookings = [];
                    pastBookings = [];

                    bookings.forEach(b => {
                        const bDate = new Date(b.booking_date);
                        const bObj = {
                            date: bDate,
                            isMonthly: b.is_monthly,
                            isTenLessons: b.is_ten_lessons,
                            id: b.id,
                            status: b.status || 'confirmed'
                        };

                        if (bObj.status === 'confirmed' && bDate >= now) {
                            upcomingBookings.push(bObj);
                        } else {
                            // Any past booking or cancelled/amended goes to history
                            pastBookings.push(bObj);
                        }
                    });

                    updateDashboard(); // re-render with the fetched data
                }
            }
        });
    }


    // ---- Calendar & Timezone Logic ----
    function detectTimezone() {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        userTimezoneEl.textContent = tz.replace('_', ' ');
    }

    function generateThaiTimeSlots(baseDateStr) {
        // Base Date is a specific day (e.g. "2024-05-20" which is a Monday)
        // We define the UTC offsets for Thai Time (UTC+7)
        // Note: Javascript Date parses ISO strings as UTC if 'Z' is appended.
        // To construct Thai time exactly, we construct it in UTC and subtract 7 hours.
        // Wait, easier: `YYYY-MM-DDTHH:MM:00+07:00` parses correctly into local time.

        const schedule = {
            1: ['17:00', '18:00'], // Monday
            2: ['17:00'],          // Tuesday
            3: ['17:00'],          // Wednesday
            4: ['17:00'],          // Thursday
            5: [],                 // Friday
            6: [],                 // Saturday
            0: ['16:00', '17:00', '18:00'] // Sunday
        };

        const slots = [];
        const targetDate = new Date(baseDateStr);
        const dayOfWeek = targetDate.getDay();

        if (schedule[dayOfWeek].length > 0) {
            schedule[dayOfWeek].forEach(timeStr => {
                // Construct ISO string with +07:00 offset
                // Format: YYYY-MM-DD
                const yyyy = targetDate.getFullYear();
                const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
                const dd = String(targetDate.getDate()).padStart(2, '0');

                const isoStr = `${yyyy}-${mm}-${dd}T${timeStr}:00+07:00`;
                const localDateObj = new Date(isoStr);

                // Convert to a local readable string
                const timeFormatter = new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                });

                slots.push({
                    raw: localDateObj,
                    display: timeFormatter.format(localDateObj)
                });
            });
        }
        return slots;
    }

    function renderCalendar() {
        daysGrid.innerHTML = '';

        const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
        currentWeekLabel.textContent = `Week of ${monthFormatter.format(currentWeekStart)}`;

        // Render 7 days starting from currentWeekStart
        for (let i = 0; i < 7; i++) {
            const thisDay = new Date(currentWeekStart);
            thisDay.setDate(thisDay.getDate() + i);

            const dayDiv = document.createElement('div');
            dayDiv.className = 'day-column';

            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(thisDay);
            const dateNum = thisDay.getDate();

            // Check if it's today
            const isToday = (new Date()).toDateString() === thisDay.toDateString();

            dayDiv.innerHTML = `
                <div class="day-header ${isToday ? 'today' : ''}">
                    <span class="day-name">${dayName}</span>
                    <span class="day-number">${dateNum}</span>
                </div>
                <div class="slots-container" id="slots-${i}">
                </div>
            `;
            daysGrid.appendChild(dayDiv);

            // Populate Slots
            const slotsContainer = dayDiv.querySelector('.slots-container');
            const localSlots = generateThaiTimeSlots(thisDay);

            if (localSlots.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.className = 'empty-slots';
                emptyMsg.textContent = '-';
                slotsContainer.appendChild(emptyMsg);
            } else {
                localSlots.forEach(slot => {
                    const btn = document.createElement('button');
                    
                    // Check if slot is already booked globally
                    const isBookedGlobally = allBookedSlots.includes(slot.raw.toISOString());
                    
                    // Also check if the current user has booked this, to be safe, though global check handles it
                    const isBookedByUser = upcomingBookings.some(b => b.date.toISOString() === slot.raw.toISOString());

                    if (isBookedGlobally || isBookedByUser) {
                        btn.className = 'slot-btn disabled';
                        btn.textContent = 'Unavailable';
                        btn.disabled = true;
                        btn.style.backgroundColor = '#e2e8f0';
                        btn.style.color = '#94a3b8';
                        btn.style.cursor = 'not-allowed';
                        btn.style.border = '1px solid #cbd5e1';
                    } else {
                        btn.className = 'slot-btn';
                        btn.textContent = slot.display;
                        btn.addEventListener('click', () => openBookingModal(slot.raw, thisDay));
                    }
                    slotsContainer.appendChild(btn);
                });
            }
        }
    }

    // ---- Dashboard Logic ----
    function updateDashboard() {
        creditBalanceDisplay.textContent = userCredits;

        const formatter = new Intl.DateTimeFormat('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
        });

        // 1. Render Upcoming
        bookingsList.innerHTML = '';
        if (upcomingBookings.length === 0) {
            bookingsList.innerHTML = '<li class="empty-bookings">No upcoming bookings. Select a time below to schedule!</li>';
        } else {
            const sortedBookings = [...upcomingBookings].sort((a, b) => a.date - b.date);
            sortedBookings.forEach(booking => {
                const li = document.createElement('li');
                // Removed 'Single Lesson' labels, per user instructions changed to 'Confirmed'
                li.innerHTML = `
                    <span class="booking-item-date">${formatter.format(booking.date)}</span>
                    <span class="booking-item-type" style="background:#dcfce7; color:#16a34a;"><i class="ph ph-check-circle"></i> Confirmed ${booking.isMonthly ? '(Monthly)' : ''}</span>
                `;
                bookingsList.appendChild(li);
            });
        }

        // 2. Render History
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        if (pastBookings.length === 0) {
            historyList.innerHTML = '<li class="empty-bookings">No past history found.</li>';
        } else {
            // Sort history descending (newest first)
            const sortedHistory = [...pastBookings].sort((a, b) => b.date - a.date);
            sortedHistory.forEach(booking => {
                const li = document.createElement('li');
                
                let badgeStyle = "background:#f1f5f9; color:#475569;";
                let label = "Completed";
                
                if (booking.status === 'cancelled') {
                    badgeStyle = "background:#fee2e2; color:#dc2626;";
                    label = "Cancelled";
                } else if (booking.status === 'amended') {
                    badgeStyle = "background:#ffedd5; color:#ea580c;";
                    label = "Rescheduled";
                }

                li.innerHTML = `
                    <span class="booking-item-date" style="color: #64748b;">${formatter.format(booking.date)}</span>
                    <span class="booking-item-type" style="${badgeStyle}">${label}</span>
                `;
                historyList.appendChild(li);
            });
        }
    }

    // ---- Booking Modal Logic ----
    function openBookingModal(dateObj, gridDay) {
        selectedDate = dateObj;

        const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        selectedSlotText.innerHTML = `Are you sure you want to book a lesson on:<br><strong>${fullDateFormatter.format(selectedDate)}</strong>`;

        // Reset checkbox
        bookMonthlyCheckbox.checked = false;
        if (bookTenLessonsCheckbox) bookTenLessonsCheckbox.checked = false;
        confirmCostDisplay.textContent = '1 Credit';

        // Show/hide monthly option based on remaining credits
        if (userCredits >= 4) {
            monthlyBookingOption.classList.remove('hidden');
        } else {
            monthlyBookingOption.classList.add('hidden');
            bookMonthlyCheckbox.checked = false; // ensure un-checked
        }

        // Show/hide 10 lesson option based on remaining credits
        if (tenLessonsBookingOption) {
            if (userCredits >= 10) {
                tenLessonsBookingOption.classList.remove('hidden');
            } else {
                tenLessonsBookingOption.classList.add('hidden');
                if (bookTenLessonsCheckbox) bookTenLessonsCheckbox.checked = false;
            }
        }

        bookingModal.classList.remove('hidden');
    }

    // ---- Messenger Logic Removed ----

    function initEventListeners() {
        // ---- Week Navigation ----
        prevWeekBtn.addEventListener('click', () => {
            currentWeekStart.setDate(currentWeekStart.getDate() - 7);
            renderCalendar();
        });

        nextWeekBtn.addEventListener('click', () => {
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            renderCalendar();
        });

        // ---- History Toggle Logic ----
        const toggleHistoryBtn = document.getElementById('toggle-history-btn');
        const historyListEl = document.getElementById('history-list');
        const historyCaret = document.getElementById('history-caret');
        
        if (toggleHistoryBtn) {
            toggleHistoryBtn.addEventListener('click', () => {
                if (historyListEl.classList.contains('hidden')) {
                    historyListEl.classList.remove('hidden');
                    historyCaret.classList.replace('ph-caret-down', 'ph-caret-up');
                } else {
                    historyListEl.classList.add('hidden');
                    historyCaret.classList.replace('ph-caret-up', 'ph-caret-down');
                }
            });
        }

        // ---- Top-Up Logic ----
        qtyMinusBtn.addEventListener('click', () => {
            if (purchaseQty > 1) {
                purchaseQty--;
                buyQtyDisplay.textContent = purchaseQty;
                buyTotalPrice.textContent = `$${purchaseQty * PRICE_PER_LESSON}`;
                if (purchaseQty <= 1) qtyMinusBtn.classList.add('disabled');
            }
        });

        qtyPlusBtn.addEventListener('click', () => {
            purchaseQty++;
            buyQtyDisplay.textContent = purchaseQty;
            buyTotalPrice.textContent = `$${purchaseQty * PRICE_PER_LESSON}`;
            qtyMinusBtn.classList.remove('disabled');
        });

        buySingleBtn.addEventListener('click', async () => {
            const btnOriginal = buySingleBtn.innerHTML;
            buySingleBtn.textContent = 'Processing...';

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            try {
                const response = await fetch('/.netlify/functions/create-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        quantity: purchaseQty,
                        userId: session.user.id,
                        userEmail: session.user.email,
                        successUrl: window.location.origin + '/booking.html?payment=success',
                        cancelUrl: window.location.origin + '/booking.html?payment=cancel'
                    })
                });

                const data = await response.json();

                if (data.url) {
                    window.location.href = data.url; // Redirect to Stripe Checkout
                } else {
                    throw new Error(data.error || 'Failed to generate checkout session');
                }
            } catch (error) {
                alert('Payment initialization failed: ' + error.message);
                buySingleBtn.innerHTML = btnOriginal;
            }
        });

        buyBundleBtn.addEventListener('click', async () => {
            const btnOriginal = buyBundleBtn.textContent;
            buyBundleBtn.textContent = 'Processing...';

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            try {
                const response = await fetch('/.netlify/functions/create-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        quantity: 10,
                        userId: session.user.id,
                        userEmail: session.user.email,
                        successUrl: window.location.origin + '/booking.html?payment=success',
                        cancelUrl: window.location.origin + '/booking.html?payment=cancel'
                    })
                });

                const data = await response.json();

                if (data.url) {
                    window.location.href = data.url; // Redirect to Stripe Checkout
                } else {
                    throw new Error(data.error || 'Failed to generate checkout session');
                }
            } catch (error) {
                alert('Payment initialization failed: ' + error.message);
                buyBundleBtn.textContent = btnOriginal;
            }
        });

        // ---- Booking Modal Logic ----
        bookMonthlyCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                if (bookTenLessonsCheckbox) bookTenLessonsCheckbox.checked = false; // Mutually exclusive
                confirmCostDisplay.textContent = '4 Credits';
            } else {
                confirmCostDisplay.textContent = '1 Credit';
            }
        });

        if (bookTenLessonsCheckbox) {
            bookTenLessonsCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    bookMonthlyCheckbox.checked = false; // Mutually exclusive
                    confirmCostDisplay.textContent = '10 Credits';
                } else {
                    confirmCostDisplay.textContent = '1 Credit';
                }
            });
        }

        cancelBookingBtn.addEventListener('click', () => {
            bookingModal.classList.add('hidden');
            selectedDate = null;
        });

        confirmBookingBtn.addEventListener('click', async () => {
            const isMonthly = bookMonthlyCheckbox.checked;
            const isTenLessons = bookTenLessonsCheckbox && bookTenLessonsCheckbox.checked;
            let requiredCredits = 1;
            
            if (isMonthly) requiredCredits = 4;
            else if (isTenLessons) requiredCredits = 10;

            if (userCredits < requiredCredits) {
                alert(`You need ${requiredCredits} credits for this booking. You only have ${userCredits} left.`);
                return;
            }

            const btnOriginal = confirmBookingBtn.textContent;
            confirmBookingBtn.textContent = 'Booking...';

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Create booking records
            const bookingInserts = [];
            
            let numLessons = 1;
            if (isMonthly) numLessons = 4;
            else if (isTenLessons) numLessons = 10;
            
            for (let i = 0; i < numLessons; i++) {
                const nextDate = new Date(selectedDate);
                nextDate.setDate(selectedDate.getDate() + (i * 7));
                bookingInserts.push({
                    user_id: session.user.id,
                    booking_date: nextDate.toISOString(),
                    is_monthly: isMonthly, // Keep for backward compatibility
                    status: 'confirmed'
                });
            }

            const { error: bookingError } = await supabase.from('bookings').insert(bookingInserts);

            if (bookingError) {
                confirmBookingBtn.textContent = btnOriginal;
                alert('Failed to save booking. Please try again.');
                return;
            }

            // Deduct credits
            const newCredits = userCredits - requiredCredits;
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ credits: newCredits })
                .eq('id', session.user.id);

            if (!profileError) {
                userCredits = newCredits;

                // Add to local UI array
                bookingInserts.forEach(b => {
                    upcomingBookings.push({ 
                        date: new Date(b.booking_date), 
                        isMonthly: b.is_monthly,
                        isTenLessons: b.is_ten_lessons 
                    });
                    
                    // Also add to global slots to immediately block it from others
                    allBookedSlots.push(b.booking_date);
                });

                updateDashboard();
                renderCalendar(); // Re-render to show disabled slots immediately

                bookingModal.classList.add('hidden');
                confirmBookingBtn.textContent = btnOriginal;

                let successMsg = 'Lesson booked! 1 credit deducted.';
                if (isMonthly) successMsg = 'Monthly slot secured! 4 credits deducted.';
                else if (isTenLessons) successMsg = '10-Lesson slot secured! 10 credits deducted.';
                
                alert(successMsg);
            } else {
                confirmBookingBtn.textContent = btnOriginal;
                alert('Failed to update credits.');
            }
        });

        // ---- Contact Form Logic ----
        const portalContactForm = document.getElementById('booking-portal-form');
        if (portalContactForm) {
            portalContactForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = portalContactForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.textContent;
                
                submitBtn.textContent = 'Sending...';
                submitBtn.disabled = true;

                const formData = {
                    name: document.getElementById('portal-name-hidden').value,
                    email: document.getElementById('portal-email').value,
                    service: "Booking Portal Help",
                    message: document.getElementById('portal-message').value
                };

                try {
                    const res = await fetch('https://formsubmit.co/ajax/andrew100br@gmail.com', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify(formData)
                    });

                    const data = await res.json();
                    if (!res.ok || data.success === 'false') throw new Error(data.message || 'Failed to send message.');

                    portalContactForm.reset();
                    alert('Message sent successfully! Teacher Andrew will reply to your email soon.');
                } catch (err) {
                    console.error(err);
                    alert('Error sending message. Please try again or use direct email if the issue persists.');
                } finally {
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                }
            });
        }

    }

});
