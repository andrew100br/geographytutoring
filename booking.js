document.addEventListener('DOMContentLoaded', () => {
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
    let userCredits = 10; // Mock starting balance for 10-lesson package
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
        });

        // Handle Submission
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btnOriginalText = authSubmitBtn.textContent;
            authSubmitBtn.textContent = 'Processing...';

            // Simulate network request
            setTimeout(() => {
                authView.classList.add('hidden');
                calendarView.classList.remove('hidden');
                authSubmitBtn.textContent = btnOriginalText;
            }, 800);
        });

        // Logout
        logoutBtn.addEventListener('click', () => {
            calendarView.classList.add('hidden');
            authView.classList.remove('hidden');
            authForm.reset();
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

    buySingleBtn.addEventListener('click', () => {
        const cost = purchaseQty * PRICE_PER_LESSON;
        // Mock payment flow
        const btnOriginal = buySingleBtn.innerHTML;
        buySingleBtn.textContent = 'Processing...';

        setTimeout(() => {
            userCredits += purchaseQty;
            updateDashboard();
            buySingleBtn.innerHTML = btnOriginal;
            alert(`Successfully purchased ${purchaseQty} lesson credit(s) for $${cost}!`);

            // Reset qty
            purchaseQty = 1;
            updatePurchaseQtyDisplay();
        }, 800);
    });

    buyBundleBtn.addEventListener('click', () => {
        // Mock payment flow
        const btnOriginal = buyBundleBtn.textContent;
        buyBundleBtn.textContent = 'Processing...';

        setTimeout(() => {
            userCredits += 10;
            updateDashboard();
            buyBundleBtn.textContent = btnOriginal;
            alert(`Successfully purchased the 10-Lesson Bundle for $270!`);
        }, 800);
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

    confirmBookingBtn.addEventListener('click', () => {
        const isMonthly = bookMonthlyCheckbox.checked;
        const requiredCredits = isMonthly ? 4 : 1;

        if (userCredits < requiredCredits) {
            alert(`You need ${requiredCredits} credits for this booking. You only have ${userCredits} left.`);
            return;
        }

        const btnOriginal = confirmBookingBtn.textContent;
        confirmBookingBtn.textContent = 'Booking...';

        setTimeout(() => {
            // Deduct credits
            userCredits -= requiredCredits;

            // Add the new booking(s)
            if (isMonthly) {
                for (let i = 0; i < 4; i++) {
                    const nextDate = new Date(selectedDate);
                    nextDate.setDate(selectedDate.getDate() + (i * 7));
                    upcomingBookings.push({ date: nextDate, isMonthly: true });
                }
            } else {
                upcomingBookings.push({ date: selectedDate, isMonthly: false });
            }

            updateDashboard();

            bookingModal.classList.add('hidden');
            confirmBookingBtn.textContent = btnOriginal;

            // Notify user
            alert(isMonthly
                ? 'Monthly slot secured! 4 credits deducted.'
                : 'Lesson booked! 1 credit deducted.');
        }, 800);
    });

});
