const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = { 'Content-Type': 'application/json' };

  try {
    const { accessToken, rating, reviewText } = JSON.parse(event.body);

    if (!accessToken || !rating || !reviewText?.trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'All fields are required.' }) };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Verify the user's session token
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated.' }) };
    }

    // Get their name from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('parent_name, child_name')
      .eq('id', user.id)
      .single();

    const reviewerName = profile?.parent_name || profile?.child_name || 'Student';
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

    // Upsert — one review per user, they can update it
    const { error: upsertError } = await supabase
      .from('reviews')
      .upsert(
        { user_id: user.id, reviewer_name: reviewerName, rating, review_text: reviewText.trim(), submitted_at: new Date().toISOString(), approved: false },
        { onConflict: 'user_id' }
      );

    if (upsertError) throw upsertError;

    // Email notification to Teacher Andrew
    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Teacher Andrew Site <newsletter@teacherandrewgeo.com>',
          to: 'andrew100br@gmail.com',
          subject: `New review from ${reviewerName}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:10px;">
              <h2 style="color:#1e3a5f;margin:0 0 8px;">New Student Review</h2>
              <p style="color:#64748b;margin:0 0 20px;font-size:14px;">A student has left a review on your website.</p>
              <div style="background:#fff;border-radius:8px;padding:20px 24px;border:1px solid #e2e8f0;">
                <p style="margin:0 0 6px;font-weight:700;color:#1e293b;font-size:16px;">${reviewerName}</p>
                <p style="margin:0 0 14px;font-size:20px;color:#f59e0b;letter-spacing:2px;">${stars}</p>
                <p style="margin:0;color:#334155;font-size:15px;line-height:1.6;">"${reviewText.trim()}"</p>
              </div>
              <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">View all reviews in your Supabase dashboard under the <strong>reviews</strong> table.</p>
            </div>
          `,
        }),
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, reviewerName }) };
  } catch (err) {
    console.error('Review submit error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
