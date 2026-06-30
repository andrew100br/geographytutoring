const { createClient } = require('@supabase/supabase-js');

// Add a new entry here each time a new monthly post is written
const SCHEDULED_POSTS = [
  {
    month: '2026-08',
    title: 'GCSE Geography Fieldwork: What to Expect and How to Prepare',
    excerpt: 'Fieldwork is compulsory and examined. Find out exactly what to memorise, how to write up your investigation, and how to score top marks.',
    url: '/blog/gcse-fieldwork-guide',
  },
  {
    month: '2026-09',
    title: 'Urban Issues and Challenges: The Complete GCSE Guide',
    excerpt: 'Master urbanisation, UK cities, LIC/NEE cities, and sustainable urban living — one of the most mark-rich topics on Paper 2.',
    url: '/blog/urban-issues-gcse',
  },
  {
    month: '2026-10',
    title: 'The Development Gap: GCSE Geography Complete Guide',
    excerpt: 'Understand global inequality, development indicators, causes of the gap, and how to evaluate strategies to close it — with exam technique built in.',
    url: '/blog/development-gap-gcse',
  },
];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = { 'Content-Type': 'application/json' };

  try {
    const { password } = JSON.parse(event.body);

    if (password !== process.env.ADMIN_PASSWORD) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorised.' }) };
    }

    // Trigger site rebuild
    const deployRes = await fetch(process.env.NETLIFY_BUILD_HOOK, { method: 'POST' });
    if (!deployRes.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to trigger deploy.' }) };
    }

    // Find this month's scheduled post
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const post = SCHEDULED_POSTS.find(p => p.month === currentMonth);

    if (!post) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ deployed: true, newsletter: false, message: 'Site is rebuilding. No newsletter scheduled for this month.' }),
      };
    }

    // Fetch subscribers
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: subscribers, error: fetchError } = await supabase
      .from('subscribers')
      .select('email, name')
      .eq('active', true);

    if (fetchError) throw fetchError;

    if (!subscribers || subscribers.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ deployed: true, newsletter: false, message: 'Site is rebuilding. No subscribers to email yet.' }),
      };
    }

    const fullUrl = `https://teacherandrewgeo.com${post.url}`;
    let sent = 0;
    let failed = 0;

    for (const sub of subscribers) {
      const firstName = sub.name ? sub.name.split(' ')[0] : 'there';

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${post.title}</title>
        </head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:600px;width:100%;">

                <tr>
                  <td style="background:#1e3a5f;padding:32px 40px;text-align:center;">
                    <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;text-transform:uppercase;letter-spacing:2px;">Teacher Andrew</p>
                    <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Geography Study Guide</h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:40px;">
                    <p style="margin:0 0 20px;color:#334155;font-size:16px;line-height:1.6;">Hi ${firstName},</p>
                    <p style="margin:0 0 24px;color:#334155;font-size:16px;line-height:1.6;">
                      I've just published a new Geography study guide — and as a subscriber, you're the first to know.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:10px;overflow:hidden;margin-bottom:28px;">
                      <tr>
                        <td style="padding:28px;">
                          <p style="margin:0 0 12px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">New Article</p>
                          <h2 style="margin:0 0 14px;color:#1e293b;font-size:20px;line-height:1.4;">${post.title}</h2>
                          <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">${post.excerpt}</p>
                          <a href="${fullUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;">Read the Full Guide &rarr;</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
                      As always, if your child needs extra support with any Geography topic, I'm here to help with personalised one-to-one lessons via Zoom.
                    </p>
                    <a href="https://teacherandrewgeo.com/booking" style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;">Book a Lesson</a>
                  </td>
                </tr>

                <tr>
                  <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                    <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">Teacher Andrew Geography Tutoring</p>
                    <p style="margin:0;color:#cbd5e1;font-size:12px;">
                      You're receiving this because you subscribed at teacherandrewgeo.com.<br/>
                      To unsubscribe, reply to this email with "unsubscribe".
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `;

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Teacher Andrew <newsletter@teacherandrewgeo.com>',
            to: sub.email,
            subject: `New Study Guide: ${post.title}`,
            html: emailHtml,
          }),
        });
        if (res.ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ deployed: true, newsletter: true, sent, failed, total: subscribers.length }),
    };
  } catch (err) {
    console.error('Deploy/newsletter error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
