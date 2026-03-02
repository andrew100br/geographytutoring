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
                const msgBtn = document.createElement('button');
                msgBtn.className = 'btn btn-primary';
                msgBtn.style.padding = '0.3rem 0.8rem';
                msgBtn.style.fontSize = '0.8rem';
                msgBtn.innerHTML = '<i class="ph ph-chat-circle-dots"></i> Message';
                msgBtn.onclick = () => openAdminChat(data.id, data.child_name || data.parent_name);
                tdActions.appendChild(msgBtn);

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

        // Calculate estimated revenue from outstanding credits
        statRevenue.textContent = `$${totalCredits * LESSON_PRICE}`;
    }

    // ---- Admin Chat Logic ----
    const chatModal = document.getElementById('admin-chat-modal');
    const closeChatBtn = document.getElementById('close-admin-chat');
    const chatTitle = document.getElementById('admin-chat-title');
    const chatBox = document.getElementById('admin-chat-box');
    const chatForm = document.getElementById('admin-chat-form');
    const chatUserIdInput = document.getElementById('admin-chat-user-id');
    const chatInput = document.getElementById('admin-chat-input');
    const chatSubmitBtn = document.getElementById('admin-chat-submit-btn');

    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            chatModal.style.display = 'none';
        });
    }

    window.openAdminChat = async function (userId, studentName) {
        chatUserIdInput.value = userId;
        chatTitle.innerHTML = `<i class="ph ph-chat-circle-dots"></i> Chat with ${studentName}`;
        chatModal.style.display = 'flex';
        await fetchAdminMessages(userId);
    };

    async function fetchAdminMessages(userId) {
        chatBox.innerHTML = '<div style="text-align: center; color: #94a3b8; margin-top: auto; margin-bottom: auto;">Loading...</div>';

        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        chatBox.innerHTML = '';

        if (error) {
            chatBox.innerHTML = '<div style="text-align: center; color: #dc2626; margin-top: auto; margin-bottom: auto;">Failed to load messages.</div>';
            return;
        }

        if (!messages || messages.length === 0) {
            chatBox.innerHTML = '<div style="text-align: center; color: #94a3b8; margin-top: auto; margin-bottom: auto;">No messages here yet. Send one!</div>';
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

            const dt = new Date(msg.created_at);
            const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + dt.toLocaleDateString();
            const timeLabel = document.createElement('span');
            timeLabel.style.fontSize = '0.7rem';
            timeLabel.style.color = '#94a3b8';
            timeLabel.style.marginTop = '0.2rem';
            timeLabel.textContent = timeStr;

            if (msg.is_from_admin) {
                // Admin (Me) is sending
                bubbleBox.style.alignSelf = 'flex-end';
                bubble.style.background = 'var(--primary-color)';
                bubble.style.color = '#fff';
                timeLabel.style.alignSelf = 'flex-end';
            } else {
                // Student is sending
                bubbleBox.style.alignSelf = 'flex-start';
                bubble.style.background = '#e2e8f0';
                bubble.style.color = '#1e293b';
                timeLabel.style.alignSelf = 'flex-start';

                const senderLabel = document.createElement('span');
                senderLabel.style.fontSize = '0.75rem';
                senderLabel.style.fontWeight = 'bold';
                senderLabel.style.color = '#64748b';
                senderLabel.style.marginBottom = '0.2rem';
                senderLabel.textContent = 'Student';
                bubbleBox.insertBefore(senderLabel, bubble);
            }

            bubbleBox.appendChild(bubble);
            bubbleBox.appendChild(timeLabel);
            chatBox.appendChild(bubbleBox);
        });

        chatBox.scrollTop = chatBox.scrollHeight;
    }

    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = chatInput.value.trim();
            const userId = chatUserIdInput.value;
            if (!content || !userId) return;

            const originalText = chatSubmitBtn.innerHTML;
            chatSubmitBtn.innerHTML = '...';
            chatSubmitBtn.disabled = true;

            const { error } = await supabase.from('messages').insert([{
                user_id: userId,
                content: content,
                is_from_admin: true
            }]);

            chatSubmitBtn.innerHTML = originalText;
            chatSubmitBtn.disabled = false;

            if (error) {
                console.error("Failed to send message", error);
                alert("Failed to send message.");
            } else {
                chatInput.value = '';
                fetchAdminMessages(userId);
            }
        });
    }

});
