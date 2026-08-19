const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { action, payload, password } = JSON.parse(event.body);

        // Very basic hardcoded admin authentication matching the frontend mockup
        if (password !== 'EnaPatchy!10') {
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
            return { statusCode: 200, body: JSON.stringify({ profiles }) };
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
            const { userId, childName, parentName, country, credits } = payload;
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
            const { error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', userId);

            if (updateError) throw updateError;
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

            // Soft-delete the booking by marking status as cancelled
            const { error: deleteError } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId);

            if (deleteError) throw deleteError;

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

            // 4. Insert a new booking with the new date, marked as rescheduled so the
            //    student can clearly see their lesson was moved (amber badge on calendar)
            const { error: insertError } = await supabase
                .from('bookings')
                .insert([{
                    user_id: oldBooking.user_id,
                    booking_date: newIsoString,
                    is_monthly: oldBooking.is_monthly,
                    is_ten_lessons: oldBooking.is_ten_lessons,
                    status: 'rescheduled'
                }]);
            if (insertError) throw insertError;

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
