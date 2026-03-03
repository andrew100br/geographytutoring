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
    const currentBookingsCount = document.getElementById('current-bookings-count');
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
    initAuth();
    detectTimezone();
    renderCalendar();
    updateDashboard();

    // ---- Session Check ----
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        const credits = profile ? profile.credits : 0;
        const parentName = profile ? profile.parent_name : "Parent";

        await loginSuccess(session.user.email, parentName, credits);
    }

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

                if (data.user) {
                    // Create profile in Supabase
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
                    }

                    await loginSuccess(email, parentNameInput.value, 0);
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

                const credits = profile ? profile.credits : 0;
                const parentName = profile ? profile.parent_name : "Parent";

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
            authView.classList.remove('hidden');
            authForm.reset();

            const hiddenNameInput = document.getElementById('portal-name-hidden');
            if (hiddenNameInput) {
                hiddenNameInput.value = "Unknown Client";
            }
        });
    }

    async function loginSuccess(email, name, credits) {
        // Set the hidden field value for the contact form
        const hiddenNameInput = document.getElementById('portal-name-hidden');
        if (hiddenNameInput) {
            hiddenNameInput.value = name;
        }

        // Set credits
        userCredits = credits || 0;

        // Fetch upcoming bookings
        const { data: { session } } = await supabase.auth.getSession();
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
            }

            // Fetch messages
            await fetchAndRenderMessages(session.user.id);
        }

        updateDashboard();

        // Transition UI
        authView.classList.add('hidden');
        calendarView.classList.remove('hidden');
        authSubmitBtn.textContent = isLoginMode ? 'Log In' : 'Create Account';
        authForm.reset();
        if (forgotPasswordContainer) forgotPasswordContainer.classList.add('hidden');
        if (resetSuccessMsg) resetSuccessMsg.classList.add('hidden');
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

    // ---- Week Navigation ----
    prevWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderCalendar();
    });

    nextWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderCalendar();
    });

    // ---- Dashboard Logic ----
    function updateDashboard() {
        creditBalanceDisplay.textContent = userCredits;
        currentBookingsCount.textContent = upcomingBookings.length;

        bookingsList.innerHTML = '';
        if (upcomingBookings.length === 0) {
            bookingsList.innerHTML = '<li class="empty-bookings">No upcoming bookings. Select a time below to schedule!</li>';
            return;
        }

        // Sort bookings by date
        const sortedBookings = [...upcomingBookings].sort((a, b) => a.date - b.date);

        const formatter = new Intl.DateTimeFormat('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit'
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

    // ---- Top-Up Logic ----
    function updatePurchaseQtyDisplay() {
        buyQtyDisplay.textContent = purchaseQty;
        buyTotalPrice.textContent = `$${purchaseQty * PRICE_PER_LESSON}`;

        if (purchaseQty <= 1) {
            qtyMinusBtn.classList.add('disabled');
        } else {
            qtyMinusBtn.classList.remove('disabled');
        }
    }

    qtyMinusBtn.addEventListener('click', () => {
        if (purchaseQty > 1) {
            purchaseQty--;
            updatePurchaseQtyDisplay();
        }
    });

    qtyPlusBtn.addEventListener('click', () => {
        purchaseQty++;
        updatePurchaseQtyDisplay();
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
            // Bundle uses a quantity of 10 to trigger the discounted logic in the serverless function
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

    // Checkbox toggle listener
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

            // Notify user
            alert(isMonthly
                ? 'Monthly slot secured! 4 credits deducted.'
                : 'Lesson booked! 1 credit deducted.');
        } else {
            confirmBookingBtn.textContent = btnOriginal;
            alert('Failed to update credits.');
        }
    });

    // ---- Messenger Logic ----
    async function fetchAndRenderMessages(userId) {
        const chatBox = document.getElementById('chat-box');
        if (!chatBox) return;

        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        chatBox.innerHTML = ''; // clear loading

        if (error) {
            console.error("Error fetching messages:", error);
            chatBox.innerHTML = '<div style="text-align: center; color: #dc2626; margin-top: auto; margin-bottom: auto;">Failed to load messages.</div>';
            return;
        }

        if (!messages || messages.length === 0) {
            chatBox.innerHTML = '<div style="text-align: center; color: #94a3b8; margin-top: auto; margin-bottom: auto;">No messages yet. Say hello!</div>';
            return;
        }

        messages.forEach(msg => {
            const bubbleBox = document.createElement('div');
            bubbleBox.style.display = 'flex';
            bubbleBox.style.flexDirection = 'column';
            bubbleBox.style.maxWidth = '80%';

            const bubble = document.createElement('div');
            bubble.style.padding = '0.75rem';
            bubble.style.borderRadius = '8px';
            bubble.textContent = msg.content;

            // Date formatting
            const dt = new Date(msg.created_at);
            const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + dt.toLocaleDateString();
            const timeLabel = document.createElement('span');
            timeLabel.style.fontSize = '0.7rem';
            timeLabel.style.color = '#94a3b8';
            timeLabel.style.marginTop = '0.2rem';
            timeLabel.textContent = timeStr;

            if (msg.is_from_admin) {
                bubbleBox.style.alignSelf = 'flex-start';
                bubble.style.background = '#e2e8f0';
                bubble.style.color = '#1e293b';
                timeLabel.style.alignSelf = 'flex-start';

                const senderLabel = document.createElement('span');
                senderLabel.style.fontSize = '0.75rem';
                senderLabel.style.fontWeight = 'bold';
                senderLabel.style.color = '#64748b';
                senderLabel.style.marginBottom = '0.2rem';
                senderLabel.textContent = 'Teacher Andrew';
                bubbleBox.insertBefore(senderLabel, bubble);
            } else {
                bubbleBox.style.alignSelf = 'flex-end';
                bubble.style.background = 'var(--primary-color)';
                bubble.style.color = '#fff';
                timeLabel.style.alignSelf = 'flex-end';
            }

            bubbleBox.appendChild(bubble);
            bubbleBox.appendChild(timeLabel);
            chatBox.appendChild(bubbleBox);
        });

        // auto scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const btn = document.getElementById('chat-submit-btn');
            const content = input.value.trim();
            if (!content) return;

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const originalText = btn.innerHTML;
            btn.innerHTML = '...';
            btn.disabled = true;

            const { error } = await supabase.from('messages').insert([{
                user_id: session.user.id,
                content: content,
                is_from_admin: false
            }]);

            btn.innerHTML = originalText;
            btn.disabled = false;

            if (error) {
                console.error("Failed to send message", error);
                alert("Failed to send message. Please try again.");
            } else {
                input.value = '';
                // Reload messages
                fetchAndRenderMessages(session.user.id);
            }
        });
    }

});
