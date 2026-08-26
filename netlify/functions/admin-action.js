const { createClient } = require('@supabase/supabase-js');
const { createCalendarEvent, deleteCalendarEvent } = require('./lib/google-calendar');
const { sanitizeFileName } = require('./lib/sanitize');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { action, payload, password } = JSON.parse(event.body);

        if (password !== process.env.ADMIN_PASSWORD) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized. Incorrect admin password.' })
            };
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

        // Initialize Supabase admin client to bypass RLS policies safely
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (action === 'get_dashboard_data') {
            const { data: profiles, error } = await supabase.from('profiles').select('*');
            if (error) throw error;
            const { data: allBookings, error: bookingsError } = await supabase.from('bookings').select('booking_date, status, user_id, is_monthly, missed');
            if (bookingsError) throw bookingsError;
            return { statusCode: 200, body: JSON.stringify({ profiles, allBookings }) };
        }

        if (action === 'delete_user') {
            const { userId } = payload;

            // Cleanup foreign keys first
            await supabase.from('bookings').delete().eq('user_id', userId);
            await supabase.from('messages').delete().eq('user_id', userId);
            await supabase.from('profiles').delete().eq('id', userId);

            // Delete from Auth
            const { error } = await supabase.auth.admin.deleteUser(userId);
            if (error) throw error;

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'add_user') {
            const { email, password, childName, parentName, country } = payload;

            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true
            });

            if (authError) throw authError;

            const { error: profileError } = await supabase.from('profiles').insert([{
                id: authData.user.id,
                email: email,
                child_name: childName,
                parent_name: parentName,
                country: country,
                credits: 0
            }]);

            if (profileError) throw profileError;

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'edit_user') {
            const { userId, childName, parentName, country, credits, isCommittedPackage } = payload;
            const updateData = {
                child_name: childName,
                parent_name: parentName,
                country: country
            };
            if (credits !== undefined && credits !== null) {
                const parsedCredits = parseInt(credits, 10);
                if (!isNaN(parsedCredits) && parsedCredits >= 0) {
                    updateData.credits = parsedCredits;
                }
            }
            if (isCommittedPackage !== undefined) {
                updateData.is_committed_package = !!isCommittedPackage;
            }
            const { error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', userId);

            if (updateError) throw updateError;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'set_committed_package') {
            const { userId, isCommittedPackage } = payload;
            const { error } = await supabase.from('profiles').update({ is_committed_package: !!isCommittedPackage }).eq('id', userId);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'set_archived') {
            const { userId, isArchived } = payload;
            const { error } = await supabase.from('profiles').update({ is_archived: !!isArchived }).eq('id', userId);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'send_message') {
            const { userId, content } = payload;
            const { error } = await supabase.from('messages').insert([{
                user_id: userId,
                content: content,
                is_from_admin: true
            }]);

            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'cancel_booking') {
            const { bookingId, userId, refund } = payload;

            // Fetch the linked calendar event (if any) before we lose track of it
            const { data: bookingToCancel } = await supabase
                .from('bookings')
                .select('calendar_event_id')
                .eq('id', bookingId)
                .single();

            // Soft-delete the booking by marking status as cancelled
            const { error: deleteError } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId);

            if (deleteError) throw deleteError;

            if (bookingToCancel?.calendar_event_id) {
                try {
                    await deleteCalendarEvent(bookingToCancel.calendar_event_id);
                } catch (err) {
                    console.error('Calendar event deletion failed:', err);
                }
            }

            // Refund if needed dynamically from DB
            if (refund) {
                const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
                const currentCredits = profile ? parseInt(profile.credits, 10) || 0 : 0;
                
                const { error: refundError } = await supabase
                    .from('profiles')
                    .update({ credits: currentCredits + 1 })
                    .eq('id', userId);

                if (refundError) throw refundError;
            }

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'reschedule_booking') {
            const { bookingId, newIsoString, refund, userId } = payload;

            // 1. Fetch the old booking to clone it
            const { data: oldBooking, error: fetchError } = await supabase
                .from('bookings')
                .select('*')
                .eq('id', bookingId)
                .single();
            if (fetchError) throw fetchError;

            // 2. Check the new slot isn't already taken by another booking
            const { data: conflict } = await supabase
                .from('bookings')
                .select('id')
                .eq('booking_date', newIsoString)
                .in('status', ['confirmed', 'rescheduled'])
                .neq('id', bookingId);
            if (conflict && conflict.length > 0) {
                return {
                    statusCode: 409,
                    body: JSON.stringify({ error: 'That time slot is already booked. Please choose a different time.' })
                };
            }

            // 3. Mark the old booking as amended
            const { error: updateError } = await supabase
                .from('bookings')
                .update({ status: 'amended' })
                .eq('id', bookingId);
            if (updateError) throw updateError;

            if (oldBooking.calendar_event_id) {
                try {
                    await deleteCalendarEvent(oldBooking.calendar_event_id);
                } catch (err) {
                    console.error('Calendar event deletion failed:', err);
                }
            }

            // 4. Insert a new booking with the new date, marked as rescheduled so the
            //    student can clearly see their lesson was moved (amber badge on calendar)
            const { data: newBookingRow, error: insertError } = await supabase
                .from('bookings')
                .insert([{
                    user_id: oldBooking.user_id,
                    booking_date: newIsoString,
                    is_monthly: oldBooking.is_monthly,
                    is_ten_lessons: oldBooking.is_ten_lessons,
                    status: 'rescheduled'
                }])
                .select('id')
                .single();
            if (insertError) throw insertError;

            try {
                const { data: reschedProfile } = await supabase.from('profiles').select('parent_name, child_name, email').eq('id', oldBooking.user_id).single();
                const studentLabel = [reschedProfile?.child_name, reschedProfile?.parent_name ? `(${reschedProfile.parent_name})` : null].filter(Boolean).join(' ') || reschedProfile?.email || 'Student';
                const start = new Date(newIsoString);
                const end = new Date(start.getTime() + 60 * 60 * 1000);
                const event = await createCalendarEvent({
                    summary: `Geography Lesson - ${studentLabel}`,
                    description: `Rescheduled via admin dashboard.`,
                    startISO: start.toISOString(),
                    endISO: end.toISOString()
                });
                await supabase.from('bookings').update({ calendar_event_id: event.id }).eq('id', newBookingRow.id);
            } catch (err) {
                console.error('Calendar event creation failed:', err);
            }

            if (refund && userId) {
                const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
                const currentCredits = profile ? parseInt(profile.credits, 10) || 0 : 0;
                
                const { error: refundError } = await supabase
                    .from('profiles')
                    .update({ credits: currentCredits + 1 })
                    .eq('id', userId);

                if (refundError) throw refundError;
            }

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'admin_book_slot') {
            const { userId, newIsoString, deductCredit } = payload;

            // Check the slot isn't already taken
            const { data: conflict } = await supabase
                .from('bookings')
                .select('id')
                .eq('booking_date', newIsoString)
                .in('status', ['confirmed', 'rescheduled']);
            if (conflict && conflict.length > 0) {
                return {
                    statusCode: 409,
                    body: JSON.stringify({ error: 'That time slot is already booked. Please choose a different time.' })
                };
            }

            const { data: newBookingRow, error: insertError } = await supabase
                .from('bookings')
                .insert([{
                    user_id: userId,
                    booking_date: newIsoString,
                    is_monthly: false,
                    is_ten_lessons: false,
                    status: 'confirmed'
                }])
                .select('id')
                .single();
            if (insertError) throw insertError;

            const { data: bookProfile } = await supabase.from('profiles').select('credits, parent_name, child_name, email').eq('id', userId).single();

            let newCredits = bookProfile?.credits || 0;
            if (deductCredit) {
                newCredits = Math.max(0, newCredits - 1);
                await supabase.from('profiles').update({ credits: newCredits }).eq('id', userId);
            }

            try {
                const studentLabel = [bookProfile?.child_name, bookProfile?.parent_name ? `(${bookProfile.parent_name})` : null].filter(Boolean).join(' ') || bookProfile?.email || 'Student';
                const start = new Date(newIsoString);
                const end = new Date(start.getTime() + 60 * 60 * 1000);
                const event = await createCalendarEvent({
                    summary: `Geography Lesson - ${studentLabel}`,
                    description: 'Booked manually via admin dashboard.',
                    startISO: start.toISOString(),
                    endISO: end.toISOString()
                });
                await supabase.from('bookings').update({ calendar_event_id: event.id }).eq('id', newBookingRow.id);
            } catch (err) {
                console.error('Calendar event creation failed:', err);
            }

            return { statusCode: 200, body: JSON.stringify({ success: true, newCredits }) };
        }

        if (action === 'block_slot') {
            const { slotIso } = payload;
            const { error } = await supabase.from('blocked_slots').insert([{ slot_date: slotIso }]);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'unblock_slot') {
            const { slotIso } = payload;
            const { error } = await supabase.from('blocked_slots').delete().eq('slot_date', slotIso);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'get_reviews') {
            const { data, error } = await supabase
                .from('reviews')
                .select('id, reviewer_name, rating, review_text, submitted_at, approved')
                .order('submitted_at', { ascending: false });
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ reviews: data }) };
        }

        if (action === 'approve_review') {
            const { reviewId } = payload;
            const { error } = await supabase.from('reviews').update({ approved: true }).eq('id', reviewId);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'delete_review') {
            const { reviewId } = payload;
            const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'get_blocked_slots') {
            const { data, error } = await supabase.from('blocked_slots').select('slot_date').gte('slot_date', new Date().toISOString());
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ blockedSlots: data.map(r => new Date(r.slot_date).toISOString()) }) };
        }

        if (action === 'get_analytics') {
            const now = new Date();
            const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
            const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
            const monthStart = new Date(now); monthStart.setDate(now.getDate() - 30);
            const yearStart = new Date(now); yearStart.setFullYear(now.getFullYear() - 1);

            // range controls how far back the breakdown data goes
            const range = (payload && payload.range) || '30d';
            const rangeStart = range === '7d' ? weekStart : range === '1y' ? yearStart : range === 'all' ? null : monthStart;
            const trendDays = range === '7d' ? 7 : range === '1y' ? 30 : 14; // for 1y, show monthly buckets

            let viewsQuery = supabase
                .from('page_views')
                .select('page, country, visited_at')
                .neq('page', '__newsletter_sent__')
                .order('visited_at', { ascending: false });

            if (rangeStart) viewsQuery = viewsQuery.gte('visited_at', rangeStart.toISOString());

            const { data: allViews, error: viewsError } = await viewsQuery;

            if (viewsError) throw viewsError;

            const { count: totalAll } = await supabase
                .from('page_views')
                .select('*', { count: 'exact', head: true })
                .neq('page', '__newsletter_sent__');

            const views = allViews || [];
            const todayViews = views.filter(v => new Date(v.visited_at) >= todayStart);
            const weekViews = views.filter(v => new Date(v.visited_at) >= weekStart);

            // Country breakdown (last 30 days)
            const countryCounts = {};
            views.forEach(v => {
                const c = v.country || 'Unknown';
                countryCounts[c] = (countryCounts[c] || 0) + 1;
            });
            const countries = Object.entries(countryCounts)
                .map(([code, count]) => ({ code, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 15);

            // Page breakdown (last 30 days)
            const pageCounts = {};
            views.forEach(v => { pageCounts[v.page] = (pageCounts[v.page] || 0) + 1; });
            const pages = Object.entries(pageCounts)
                .map(([page, count]) => ({ page, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            // Trend — daily buckets for 7d/30d, monthly buckets for 1y/all
            const trend = [];
            if (range === '1y' || range === 'all') {
                // Monthly buckets for the last 12 months
                for (let i = 11; i >= 0; i--) {
                    const d = new Date(now); d.setDate(1); d.setHours(0,0,0,0);
                    d.setMonth(d.getMonth() - i);
                    const key = d.toISOString().slice(0, 7); // YYYY-MM
                    trend.push({ date: key, count: 0 });
                }
                views.forEach(v => {
                    const month = v.visited_at.slice(0, 7);
                    const bucket = trend.find(t => t.date === month);
                    if (bucket) bucket.count++;
                });
            } else {
                const days = range === '7d' ? 7 : 30;
                for (let i = days - 1; i >= 0; i--) {
                    const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0,0,0,0);
                    trend.push({ date: d.toISOString().slice(0, 10), count: 0 });
                }
                views.forEach(v => {
                    const day = v.visited_at.slice(0, 10);
                    const bucket = trend.find(t => t.date === day);
                    if (bucket) bucket.count++;
                });
            }

            const { count: accountsCreated } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            const { data: purchasedUsers } = await supabase
                .from('bookings')
                .select('user_id');
            const accountsPurchased = purchasedUsers
                ? new Set(purchasedUsers.map(b => b.user_id)).size
                : 0;

            return { statusCode: 200, body: JSON.stringify({
                today: todayViews.length,
                thisWeek: weekViews.length,
                thisMonth: views.length,
                allTime: totalAll || 0,
                countries,
                pages,
                trend,
                accountsCreated: accountsCreated || 0,
                accountsPurchased,
            })};
        }

        // ------------------------------------------------------------------
        // Dashboard redesign — Zoom credentials, exams, lesson notes, quiz
        // scores, mock exams, homework. All additive; none of this touches
        // profiles.credits, bookings, or Supabase Auth.
        // ------------------------------------------------------------------

        if (action === 'set_zoom_credentials') {
            const { userId, zoomLink, zoomPassword } = payload;
            const { error } = await supabase
                .from('profiles')
                .update({ zoom_link: zoomLink || null, zoom_password: zoomPassword || null })
                .eq('id', userId);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'get_student_data') {
            const { userId } = payload;
            const [examsRes, notesRes, quizRes, mocksRes, hwRes, bookingsRes] = await Promise.all([
                supabase.from('student_exams').select('*').eq('user_id', userId).order('exam_date', { ascending: true }),
                supabase.from('lesson_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                supabase.from('quiz_scores').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                supabase.from('mock_exams').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                supabase.from('homework').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                supabase.from('bookings').select('*').eq('user_id', userId).order('booking_date', { ascending: false }),
            ]);
            if (examsRes.error) throw examsRes.error;
            if (notesRes.error) throw notesRes.error;
            if (quizRes.error) throw quizRes.error;
            if (mocksRes.error) throw mocksRes.error;
            if (hwRes.error) throw hwRes.error;
            if (bookingsRes.error) throw bookingsRes.error;
            return {
                statusCode: 200,
                body: JSON.stringify({
                    exams: examsRes.data,
                    lessonNotes: notesRes.data,
                    quizScores: quizRes.data,
                    mockExams: mocksRes.data,
                    homework: hwRes.data,
                    bookings: bookingsRes.data,
                }),
            };
        }

        if (action === 'add_student_exam') {
            const { userId, name, examDate } = payload;
            const { error } = await supabase.from('student_exams').insert([{ user_id: userId, name, exam_date: examDate }]);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'update_student_exam') {
            const { examId, name, examDate } = payload;
            const { error } = await supabase.from('student_exams').update({ name, exam_date: examDate }).eq('id', examId);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'delete_student_exam') {
            const { examId } = payload;
            const { error } = await supabase.from('student_exams').delete().eq('id', examId);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        // Large files (whiteboard scans, marked mock papers) go straight from the
        // browser to Supabase Storage via a signed upload URL — routing the file
        // bytes through this function would hit Netlify's ~6MB request-body cap.
        if (action === 'create_upload_url') {
            const { folder, fileName } = payload;
            const path = `${folder}/${Date.now()}-${sanitizeFileName(fileName)}`;
            const { data, error } = await supabase.storage.from('dashboard-files').createSignedUploadUrl(path);
            if (error) throw error;
            const { data: pub } = supabase.storage.from('dashboard-files').getPublicUrl(path);
            return { statusCode: 200, body: JSON.stringify({ path: data.path, token: data.token, publicUrl: pub.publicUrl }) };
        }

        if (action === 'add_lesson_note') {
            const { userId, bookingId, lessonNumber, topic, pdfUrl } = payload;
            const { error } = await supabase.from('lesson_notes').insert([{
                user_id: userId, booking_id: bookingId || null, lesson_number: lessonNumber || null, topic, pdf_url: pdfUrl || null,
            }]);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'update_lesson_note') {
            const { noteId, topic, pdfUrl } = payload;
            const updateData = { topic };
            if (pdfUrl) updateData.pdf_url = pdfUrl;
            const { error } = await supabase.from('lesson_notes').update(updateData).eq('id', noteId);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'delete_lesson_note') {
            const { noteId } = payload;
            const { error } = await supabase.from('lesson_notes').delete().eq('id', noteId);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'add_quiz_score') {
            const { userId, bookingId, lessonNumber, topic, score, outOf } = payload;
            const { error } = await supabase.from('quiz_scores').insert([{
                user_id: userId, booking_id: bookingId || null, lesson_number: lessonNumber || null, topic: topic || null,
                score: parseInt(score, 10) || 0, out_of: parseInt(outOf, 10) || 10,
            }]);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'add_mock_exam') {
            const { userId, title, info, result, examDate, fileUrl } = payload;
            const { error } = await supabase.from('mock_exams').insert([{
                user_id: userId, title, info: info || null, result: result || null, exam_date: examDate || null, file_url: fileUrl || null,
            }]);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'delete_mock_exam') {
            const { mockExamId } = payload;
            const { error } = await supabase.from('mock_exams').delete().eq('id', mockExamId);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'add_homework') {
            const { userId, bookingId, lessonNumber, dueDate, instructions, fileUrl } = payload;
            const { error } = await supabase.from('homework').insert([{
                user_id: userId, booking_id: bookingId || null, lesson_number: lessonNumber || null, due_date: dueDate || null, instructions: instructions || null, file_url: fileUrl || null,
            }]);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'update_homework') {
            const { homeworkId, dueDate, instructions, fileUrl } = payload;
            const updateData = { due_date: dueDate || null, instructions: instructions || null };
            if (fileUrl) updateData.file_url = fileUrl;
            const { error } = await supabase.from('homework').update(updateData).eq('id', homeworkId);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'delete_homework') {
            const { homeworkId } = payload;
            const { error } = await supabase.from('homework').delete().eq('id', homeworkId);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'mark_booking_missed') {
            const { bookingId, missed } = payload;
            const { error } = await supabase.from('bookings').update({ missed: !!missed }).eq('id', bookingId);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'get_subscribers') {
            const { data: subscribers, error: subError } = await supabase
                .from('subscribers')
                .select('id, email, name, subscribed_at, active')
                .order('subscribed_at', { ascending: false });
            if (subError) throw subError;

            const { data: nlHistory } = await supabase
                .from('page_views')
                .select('visited_at, country')
                .eq('page', '__newsletter_sent__')
                .order('visited_at', { ascending: false });

            return {
                statusCode: 200,
                body: JSON.stringify({
                    subscribers: subscribers || [],
                    newsletterHistory: (nlHistory || []).map(r => {
                        try { return { sent_at: r.visited_at, ...JSON.parse(r.country) }; }
                        catch { return { sent_at: r.visited_at }; }
                    }),
                }),
            };
        }

        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Unknown action specified.' })
        };

    } catch (error) {
        console.error('Admin Action Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
