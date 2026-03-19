document.addEventListener('DOMContentLoaded', () => {

    // Login Overlay Elements
    const loginOverlay = document.getElementById('admin-login-overlay');
    const loginForm = document.getElementById('admin-login-form');
    const adminUser = document.getElementById('admin-user');
    const adminPass = document.getElementById('admin-pass');
    const adminError = document.getElementById('admin-error');
    const logoutBtn = document.getElementById('admin-logout-btn');

    // Dashboard Data Elements
    const statStudents = document.getElementById('stat-students');
    const statCredits = document.getElementById('stat-credits');
    const statRevenue = document.getElementById('stat-revenue');
    const studentTableBody = document.getElementById('student-table-body');

    // Hardcoded Admin Credentials for Mockup
    const MOCK_ADMIN_USER = 'admin';
    const MOCK_ADMIN_PASS = 'EnaPatchy!10';
    const LESSON_PRICE = 25; // £25 per lesson

    // ---- Admin Auth Logic ----

    // Check if already logged in this session
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
        loginOverlay.style.display = 'none';
        loadDashboardData();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const user = adminUser.value.trim().toLowerCase();
        const pass = adminPass.value;

        if (user === MOCK_ADMIN_USER && pass === MOCK_ADMIN_PASS) {
            // Success
            sessionStorage.setItem('admin_logged_in', 'true');
            loginOverlay.style.display = 'none';
            loadDashboardData();
        } else {
            // Fail
            adminError.textContent = 'Incorrect admin credentials.';
            adminPass.value = '';
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('admin_logged_in');
        window.location.reload(); // Refresh to show login screen
    });

    // ---- Dashboard Data Loading ----

    async function loadDashboardData() {
        let accounts = [];
        let error = null;

        try {
            const res = await fetch('/.netlify/functions/admin-action', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'get_dashboard_data',
                    password: MOCK_ADMIN_PASS
                })
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            accounts = data.profiles || [];
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
            error = err;
        }

        let totalStudents = accounts ? accounts.length : 0;
        let totalCredits = 0;

        // Clear table
        studentTableBody.innerHTML = '';

        if (totalStudents === 0 || error) {
            studentTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b;">No student accounts have been created yet.</td></tr>`;
        } else {
            // Iterate through every account and build table rows
            accounts.forEach(data => {
                totalCredits += (data.credits || 0);

                const tr = document.createElement('tr');

                // Child Name
                const tdChild = document.createElement('td');
                tdChild.innerHTML = `<strong>${data.child_name || 'N/A'}</strong>`;

                // Parent Name
                const tdParent = document.createElement('td');
                tdParent.textContent = data.parent_name || 'N/A';

                // Email
                const tdEmail = document.createElement('td');
                tdEmail.textContent = data.email;
                tdEmail.style.color = '#64748b';

                // Country
                const tdCountry = document.createElement('td');
                tdCountry.textContent = data.country || 'N/A';

                // Credit Balance
                const tdCredit = document.createElement('td');
                const credits = data.credits || 0;
                tdCredit.innerHTML = `<span class="badge-credit" ${credits === 0 ? 'style="background:#fee2e2; color:#991b1b;"' : ''}>${credits} Lessons</span>`;

                // Actions
                const tdActions = document.createElement('td');
                tdActions.style.display = 'flex';
                tdActions.style.gap = '0.5rem';

                const detailsBtn = document.createElement('button');
                detailsBtn.className = 'btn btn-outline';
                detailsBtn.style.padding = '0.3rem 0.8rem';
                detailsBtn.style.fontSize = '0.8rem';
                detailsBtn.innerHTML = '<i class="ph ph-list-dashes"></i> Details';
                detailsBtn.onclick = () => openAdminDetails(data.id, data.child_name || data.parent_name, credits);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-outline';
                deleteBtn.style.padding = '0.3rem 0.8rem';
                deleteBtn.style.fontSize = '0.8rem';
                deleteBtn.style.color = '#dc2626';
                deleteBtn.style.borderColor = '#fca5a5';
                deleteBtn.innerHTML = '<i class="ph ph-trash"></i> Delete';
                deleteBtn.onclick = () => deleteAdminClient(data.id, data.child_name || data.parent_name);

                tdActions.appendChild(detailsBtn);
                tdActions.appendChild(deleteBtn);

                tr.appendChild(tdChild);
                tr.appendChild(tdParent);
                tr.appendChild(tdEmail);
                tr.appendChild(tdCountry);
                tr.appendChild(tdCredit);
                tr.appendChild(tdActions);

                studentTableBody.appendChild(tr);
            });
        }

        // Update High-Level Stats
        statStudents.textContent = totalStudents;
        statCredits.textContent = totalCredits;

        // Fetch past bookings to calculate actual revenue
        let actualRevenue = 0;
        const now = new Date();
        try {
            // We fetch all past bookings to see which ones actually happened
            const { data: allBookings, error: bErr } = await supabase
                .from('bookings')
                .select('booking_date, status');
            
            if (!bErr && allBookings) {
                allBookings.forEach(b => {
                    const bDate = new Date(b.booking_date);
                    // Only count if it's in the past AND not cancelled or amended
                    if (bDate < now && b.status !== 'cancelled' && b.status !== 'amended') {
                        actualRevenue += LESSON_PRICE;
                    }
                });
            }
        } catch (e) {
            console.error("Error fetching completed bookings for revenue:", e);
        }

        statRevenue.textContent = `£${actualRevenue}`;
    }

    // ---- Admin Chat Logic Removed ----

    // ---- Admin Details Logic ----
    const detailsModal = document.getElementById('admin-details-modal');
    const closeDetailsBtn = document.getElementById('close-admin-details');
    const detailsTitle = document.getElementById('admin-details-title');
    const detailsMembership = document.getElementById('admin-details-membership');
    const detailsCredits = document.getElementById('admin-details-credits');
    const bookingsUl = document.getElementById('admin-bookings-ul');

    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', () => {
            detailsModal.style.display = 'none';
        });
    }

    window.openAdminDetails = async function (userId, studentName, credits) {
        detailsTitle.innerHTML = `<i class="ph ph-user-circle"></i> Details for ${studentName}`;
        detailsCredits.textContent = `${credits} Lesson(s)`;
        detailsMembership.textContent = 'Calculating...';
        bookingsUl.innerHTML = '<li style="padding: 1rem; text-align: center; color: #94a3b8;">Loading bookings...</li>';

        detailsModal.style.display = 'flex';

        // Fetch Bookings
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('user_id', userId)
            .order('booking_date', { descending: true });

        bookingsUl.innerHTML = '';

        if (error) {
            bookingsUl.innerHTML = '<li style="padding: 1rem; text-align: center; color: #dc2626;">Failed to load bookings</li>';
            detailsMembership.textContent = 'Unknown';
            return;
        }

        const now = new Date();
        const futureBookings = bookings ? bookings.filter(b => b.status === 'confirmed' && new Date(b.booking_date) >= now).sort((a,b) => new Date(a.booking_date) - new Date(b.booking_date)) : [];
        const hasMonthly = futureBookings.some(b => b.is_monthly);

        if (hasMonthly) {
            detailsMembership.innerHTML = '<span style="color: #16a34a;"><i class="ph ph-star"></i> Monthly Subscriber</span>';
        } else if (futureBookings.length > 0 || credits > 0) {
            detailsMembership.innerHTML = '<span>Pay As You Go</span>';
        } else {
            detailsMembership.innerHTML = '<span style="color: #ea580c;">Trial / Lead</span>';
        }

        if (!bookings || bookings.length === 0) {
            bookingsUl.innerHTML = '<li style="padding: 1rem; text-align: center; color: #94a3b8;">No bookings found.</li>';
        } else {
            const formatter = new Intl.DateTimeFormat('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit'
            });

            bookings.forEach(b => {
                const isFutureConfirmed = b.status === 'confirmed' && new Date(b.booking_date) >= now;
                const li = document.createElement('li');
                li.style.padding = '0.75rem 1rem';
                li.style.borderBottom = '1px solid var(--border-color)';
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';

                const dtStr = formatter.format(new Date(b.booking_date));
                let badge = '';

                if (isFutureConfirmed) {
                    badge = b.is_monthly
                        ? `<span style="background: #e0e7ff; color: #4338ca; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Active Monthly</span>`
                        : `<span style="background: #dcfce7; color: #16a34a; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Confirmed</span>`;
                } else if (b.status === 'cancelled') {
                    badge = `<span style="background: #fee2e2; color: #dc2626; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Cancelled</span>`;
                } else if (b.status === 'amended') {
                    badge = `<span style="background: #ffedd5; color: #ea580c; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Rescheduled</span>`;
                } else {
                    badge = `<span style="background: #f1f5f9; color: #475569; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Completed</span>`;
                }

                const infoDiv = document.createElement('div');
                infoDiv.innerHTML = `<span style="${!isFutureConfirmed ? 'color:#94a3b8;' : ''}">${dtStr}</span> &nbsp; ${badge}`;

                const actionsDiv = document.createElement('div');
                actionsDiv.style.display = 'flex';
                actionsDiv.style.gap = '0.5rem';

                if (isFutureConfirmed) {
                    const rescheduleBtn = document.createElement('button');
                    rescheduleBtn.className = 'btn btn-outline';
                    rescheduleBtn.style.padding = '0.2rem 0.5rem';
                    rescheduleBtn.style.fontSize = '0.75rem';
                    rescheduleBtn.innerHTML = '<i class="ph ph-calendar-blank"></i> Amend';
                    rescheduleBtn.onclick = () => openAdminReschedule(b.id, b.booking_date, userId, studentName, credits);

                    const cancelBtn = document.createElement('button');
                    cancelBtn.className = 'btn btn-outline';
                    cancelBtn.style.padding = '0.2rem 0.5rem';
                    cancelBtn.style.fontSize = '0.75rem';
                    cancelBtn.style.color = '#dc2626';
                    cancelBtn.style.borderColor = '#fca5a5';
                    cancelBtn.innerHTML = '<i class="ph ph-trash"></i> Cancel';
                    cancelBtn.onclick = () => cancelAdminBooking(b.id, userId, studentName, credits);

                    actionsDiv.appendChild(rescheduleBtn);
                    actionsDiv.appendChild(cancelBtn);
                }

                li.appendChild(infoDiv);
                li.appendChild(actionsDiv);
                bookingsUl.appendChild(li);
            });
        }
    };

    window.cancelAdminBooking = async function (bookingId, userId, studentName, currentCredits) {
        if (!confirm("Are you sure you want to cancel this booking?")) {
            return;
        }

        const refund = confirm("Would you like to refund 1 credit back to the student for this cancellation?");

        try {
            const res = await fetch('/.netlify/functions/admin-action', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'cancel_booking',
                    password: MOCK_ADMIN_PASS,
                    payload: { bookingId, userId, refund }
                })
            });
            if (!res.ok) throw new Error(await res.text());

            if (refund) {
                alert('Booking cancelled and 1 credit refunded.');
            } else {
                alert('Booking cancelled (no credit refunded).');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to cancel booking.');
            return;
        }

        // 3. Refresh data
        detailsModal.style.display = 'none';
        loadDashboardData();
    };

    // ---- Admin Reschedule Logic ----
    const rescheduleModal = document.getElementById('admin-reschedule-modal');
    const closeRescheduleBtn = document.getElementById('close-admin-reschedule');
    const rescheduleForm = document.getElementById('admin-reschedule-form');
    const rescheduleBookingId = document.getElementById('reschedule-booking-id');
    const rescheduleUserId = document.getElementById('reschedule-user-id');
    const rescheduleStudentName = document.getElementById('reschedule-student-name');
    const rescheduleCredits = document.getElementById('reschedule-credits');
    const rescheduleDatetime = document.getElementById('reschedule-datetime');
    const rescheduleSubmitBtn = document.getElementById('reschedule-submit-btn');

    if (closeRescheduleBtn) {
        closeRescheduleBtn.addEventListener('click', () => {
            rescheduleModal.style.display = 'none';
        });
    }

    if (rescheduleForm) {
        rescheduleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const bookingId = rescheduleBookingId.value;
            const newIsoString = new Date(rescheduleDatetime.value).toISOString();
            const refund = document.getElementById('reschedule-refund-checkbox') ? document.getElementById('reschedule-refund-checkbox').checked : false;
            const userId = rescheduleUserId.value;

            const originalText = rescheduleSubmitBtn.innerHTML;
            rescheduleSubmitBtn.innerHTML = 'Processing...';
            rescheduleSubmitBtn.disabled = true;

            let error = null;
            try {
                const res = await fetch('/.netlify/functions/admin-action', {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'reschedule_booking',
                        password: MOCK_ADMIN_PASS,
                        payload: { bookingId, newIsoString, refund, userId }
                    })
                });
                if (!res.ok) throw new Error(await res.text());
            } catch (err) {
                error = err;
            }

            rescheduleSubmitBtn.innerHTML = originalText;
            rescheduleSubmitBtn.disabled = false;

            if (error) {
                alert('Failed to reschedule booking.');
            } else {
                let msg = 'Booking successfully amended!';
                if (refund) msg += ' 1 credit was refunded.';
                alert(msg);
                rescheduleModal.style.display = 'none';
                detailsModal.style.display = 'none'; // Close details so they can reload
                loadDashboardData();
            }
        });
    }

    window.openAdminReschedule = function (bookingId, currentIsoDate, userId, studentName, credits) {
        try {
            rescheduleBookingId.value = bookingId;
            rescheduleUserId.value = userId;
            rescheduleStudentName.value = studentName;
            rescheduleCredits.value = credits;

            const refundCheckbox = document.getElementById('reschedule-refund-checkbox');
            if (refundCheckbox) refundCheckbox.checked = false;

            // Format current date for datetime-local input (YYYY-MM-DDThh:mm)
            const d = new Date(currentIsoDate);
            if (!isNaN(d)) {
                const pad = (n) => n < 10 ? '0' + n : n;
                const formattedLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                rescheduleDatetime.value = formattedLocal;
            }
            
            rescheduleModal.style.display = 'flex';
        } catch(e) {
            console.error("Error setting up reschedule modal:", e);
            rescheduleModal.style.display = 'flex'; // Ensure it opens even if date fails
        }
    };

    window.deleteAdminClient = async function (userId, studentName) {
        if (!confirm(`Are you EXTREMELY sure you want to completely delete ${studentName}'s account? This will permanently erase their bookings, messages, and profile. This action cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch('/.netlify/functions/admin-action', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'delete_user',
                    password: MOCK_ADMIN_PASS,
                    payload: { userId }
                })
            });
            if (!res.ok) throw new Error(await res.text());

            alert(`Successfully deleted ${studentName}'s account.`);
            loadDashboardData();
        } catch (err) {
            console.error(err);
            alert('Failed to delete client account.');
        }
    };

    // ---- Admin Add Client Logic ----
    const addModal = document.getElementById('admin-add-modal');
    const openAddBtn = document.getElementById('open-add-client-btn');
    const closeAddBtn = document.getElementById('close-admin-add');
    const addForm = document.getElementById('admin-add-form');
    const addSubmitBtn = document.getElementById('add-submit-btn');
    const addErrorMsg = document.getElementById('add-error-msg');

    if (openAddBtn) {
        openAddBtn.addEventListener('click', () => {
            addModal.style.display = 'flex';
        });
    }

    if (closeAddBtn) {
        closeAddBtn.addEventListener('click', () => {
            addModal.style.display = 'none';
        });
    }

    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            addErrorMsg.style.display = 'none';
            const originalText = addSubmitBtn.innerHTML;
            addSubmitBtn.innerHTML = 'Creating...';
            addSubmitBtn.disabled = true;

            const payload = {
                parentName: document.getElementById('add-parent-name').value.trim(),
                childName: document.getElementById('add-child-name').value.trim(),
                email: document.getElementById('add-email').value.trim().toLowerCase(),
                country: document.getElementById('add-country').value.trim(),
                password: document.getElementById('add-password').value
            };

            try {
                const res = await fetch('/.netlify/functions/admin-action', {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'add_user',
                        password: MOCK_ADMIN_PASS,
                        payload
                    })
                });

                if (!res.ok) {
                    const errorObj = await res.json();
                    throw new Error(errorObj.error || "Failed to create account.");
                }

                alert('Account created successfully!');
                addForm.reset();
                addModal.style.display = 'none';
                loadDashboardData();

            } catch (err) {
                console.error(err);
                addErrorMsg.textContent = err.message;
                addErrorMsg.style.display = 'block';
            } finally {
                addSubmitBtn.innerHTML = originalText;
                addSubmitBtn.disabled = false;
            }
        });
    }

});
