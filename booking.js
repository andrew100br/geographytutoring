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
    let upcomingBookings = []; // Array to hold bookings
    let purchaseQty = 1;
    const PRICE_PER_LESSON = 30;

    let currentWeekStart = new Date();
    // Normalize to start of current week (Monday)
    const day = currentWeekStart.getDay();
    const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart.setDate(diff);
    currentWeekStart.setHours(0, 0, 0, 0);

    let selectedDate = null;

    // ---- Initialization ----
    initEventListeners();
    initAuth();
    detectTimezone();
    renderCalendar();
    updateDashboard();

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
                    .eq('user_id', session.user.id);

                if (bookings) {
                    upcomingBookings = bookings.map(b => ({
                        date: new Date(b.booking_date),
                        isMonthly: b.is_monthly,
                        id: b.id
                    }));
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
                    btn.className = 'slot-btn';
                    btn.textContent = slot.display;
                    btn.addEventListener('click', () => openBookingModal(slot.raw, thisDay));
                    slotsContainer.appendChild(btn);
                });
            }
        }
    }

    // ---- Dashboard Logic ----
    function updateDashboard() {
        creditBalanceDisplay.textContent = userCredits;


        bookingsList.innerHTML = '';
        if (upcomingBookings.length === 0) {
            bookingsList.innerHTML = '<li class="empty-bookings">No upcoming bookings. Select a time below to schedule!</li>';
            return;
        }

        // Sort bookings by date
        const sortedBookings = [...upcomingBookings].sort((a, b) => a.date - b.date);

        const formatter = new Intl.DateTimeFormat('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
        });

        sortedBookings.forEach(booking => {
            const li = document.createElement('li');
            const typeLabel = booking.isMonthly ? 'Monthly Slot' : 'Single Lesson';
            const typeClass = booking.isMonthly ? 'monthly' : '';

            li.innerHTML = `
                <span class="booking-item-date">${formatter.format(booking.date)}</span>
                <span class="booking-item-type ${typeClass}">${typeLabel}</span>
            `;
            bookingsList.appendChild(li);
        });
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
        confirmCostDisplay.textContent = '1 Credit';

        // Show/hide monthly option based on remaining credits
        if (userCredits >= 4) {
            monthlyBookingOption.classList.remove('hidden');
        } else {
            monthlyBookingOption.classList.add('hidden');
            bookMonthlyCheckbox.checked = false; // ensure un-checked
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
                confirmCostDisplay.textContent = '4 Credits';
            } else {
                confirmCostDisplay.textContent = '1 Credit';
            }
        });

        cancelBookingBtn.addEventListener('click', () => {
            bookingModal.classList.add('hidden');
            selectedDate = null;
        });

        confirmBookingBtn.addEventListener('click', async () => {
            const isMonthly = bookMonthlyCheckbox.checked;
            const requiredCredits = isMonthly ? 4 : 1;

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
            if (isMonthly) {
                for (let i = 0; i < 4; i++) {
                    const nextDate = new Date(selectedDate);
                    nextDate.setDate(selectedDate.getDate() + (i * 7));
                    bookingInserts.push({
                        user_id: session.user.id,
                        booking_date: nextDate.toISOString(),
                        is_monthly: true,
                        status: 'confirmed'
                    });
                }
            } else {
                bookingInserts.push({
                    user_id: session.user.id,
                    booking_date: selectedDate.toISOString(),
                    is_monthly: false,
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
                    upcomingBookings.push({ date: new Date(b.booking_date), isMonthly: b.is_monthly });
                });

                updateDashboard();

                bookingModal.classList.add('hidden');
                confirmBookingBtn.textContent = btnOriginal;

                alert(isMonthly
                    ? 'Monthly slot secured! 4 credits deducted.'
                    : 'Lesson booked! 1 credit deducted.');
            } else {
                confirmBookingBtn.textContent = btnOriginal;
                alert('Failed to update credits.');
            }
        });

    }

});
