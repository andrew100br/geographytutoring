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
    const MOCK_ADMIN_PASS = 'password123';
    const LESSON_PRICE = 30; // $30 per lesson

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
        // Fetch profiles from Supabase
        const { data: accounts, error } = await supabase.from('profiles').select('*');

        let totalStudents = accounts ? accounts.length : 0;
        let totalCredits = 0;

        // Clear table
        studentTableBody.innerHTML = '';

        if (totalStudents === 0 || error) {
            studentTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b;">No student accounts have been created yet.</td></tr>`;
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

                tr.appendChild(tdChild);
                tr.appendChild(tdParent);
                tr.appendChild(tdEmail);
                tr.appendChild(tdCountry);
                tr.appendChild(tdCredit);

                studentTableBody.appendChild(tr);
            });
        }

        // Update High-Level Stats
        statStudents.textContent = totalStudents;
        statCredits.textContent = totalCredits;

        // Calculate estimated revenue from outstanding credits
        statRevenue.textContent = `$${totalCredits * LESSON_PRICE}`;
    }

});
