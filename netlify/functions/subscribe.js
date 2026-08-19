const { createClient } = require('@supabase/supabase-js');

// Keep this in sync with src/app/blog/page.tsx allPosts
const ALL_POSTS = [
  { date: '2026-10-01', title: 'The Development Gap: GCSE Geography Complete Guide', excerpt: 'Understand global inequality, development indicators, causes of the gap, and how to evaluate strategies to close it — with exam technique built in.', url: '/blog/development-gap-gcse' },
  { date: '2026-09-01', title: 'Urban Issues and Challenges: The Complete GCSE Guide', excerpt: 'Master urbanisation, UK cities, LIC/NEE cities, and sustainable urban living — one of the most mark-rich topics on Paper 2.', url: '/blog/urban-issues-gcse' },
  { date: '2026-08-01', title: 'GCSE Geography Fieldwork: What to Expect and How to Prepare', excerpt: 'Fieldwork is compulsory and examined. Find out exactly what to memorise, how to write up your investigation, and how to score top marks.', url: '/blog/gcse-fieldwork-guide' },
  { date: '2026-07-01', title: 'Rivers and Coasts: The Complete GCSE Geography Guide', excerpt: 'Master the physical geography of rivers and coasts. Processes, landforms, case studies, and exam technique — all in one guide.', url: '/blog/rivers-and-coasts-guide' },
  { date: '2026-06-01', title: 'How to Write a Perfect Extended Answer: AQA, Edexcel & Cambridge IGCSE', excerpt: 'AQA have 9 marks, Edexcel 8, Cambridge IGCSE 7 — and each marks differently. Learn the exact structure for your curriculum to score maximum marks.', url: '/blog/how-to-write-9-mark-answer' },
  { date: '2026-05-01', title: 'Top 5 Geography Topics That Appear Every Year in GCSE Exams', excerpt: 'Find out which Geography topics are guaranteed to appear in your GCSE exam every year — and how to score maximum marks on each one.', url: '/blog/gcse-exam-topics' },
  { date: '2026-04-08', title: '5 Reasons Online Geography Tutoring Can Transform Your Child\'s Grade', excerpt: 'Discover why one-to-one online tutoring with an expert teacher produces results that years of classroom lessons simply cannot.', url: '/blog/benefits-of-online-tutoring' },
  { date: '2026-04-02', title: 'How to Ace AQA GCSE Geography Paper 2: Human Geography', excerpt: 'Your complete guide to Paper 2 — urban issues, the changing economic world, and resource management, with exam technique tips.', url: '/blog/aqa-paper-2-guide' },
  { date: '2026-03-20', title: 'Climate Change and Your GCSE Geography: Everything You Need to Know', excerpt: 'From the enhanced greenhouse effect to mitigation vs adaptation — a complete GCSE guide to climate change with exam tips.', url: '/blog/climate-change-gcse' },
  { date: '2024-03-15', title: 'How to Effectively Study for GCSE Geography', excerpt: 'Discover proven revision techniques and strategies to confidently tackle your upcoming Geography exams.', url: '/blog/gcse-study-tips' },
  { date: '2024-02-28', title: 'Why Geography Matters More Than Ever in 2024', excerpt: 'From climate change to geopolitics, understanding our world is crucial. Here\'s why geography is the most relevant subject today.', url: '/blog/why-geography-matters' },
  { date: '2024-01-10', title: 'Understanding Tectonic Hazards', excerpt: 'A deep dive into earthquakes, volcanoes, and tsunamis. Perfect for AQA and Edexcel students looking to master this core topic.', url: '/blog/tectonic-hazards' },
];

function getLatestPublishedPost() {
  const today = new Date().toISOString().slice(0, 10);
  const published = ALL_POSTS.filter(p => p.date <= today);
  return published.length > 0 ? published[0] : null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { email, name } = JSON.parse(event.body);
    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email is required.' }) };

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from('subscribers')
      .insert([{ email: email.toLowerCase().trim(), name: name || '' }]);

    if (error) {
      if (error.code === '23505') {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }
      throw error;
    }

    // Send welcome email with the latest published blog post
    if (process.env.RESEND_API_KEY) {
      const firstName = name ? name.split(' ')[0] : 'there';
      const post = getLatestPublishedPost();
      const postHtml = post ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:10px;overflow:hidden;margin-bottom:28px;">
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Latest Study Guide</p>
              <h2 style="margin:0 0 12px;color:#1e293b;font-size:19px;line-height:1.4;">${post.title}</h2>
              <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">${post.excerpt}</p>
              <a href="https://teacherandrewgeo.com${post.url}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;">Read the Full Guide &rarr;</a>
            </td>
          </tr>
        </table>` : '';

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Teacher Andrew <newsletter@teacherandrewgeo.com>',
          to: email.toLowerCase().trim(),
          subject: 'Welcome — you\'re subscribed to Teacher Andrew\'s Geography guides',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
                <tr><td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:600px;width:100%;">

                    <tr>
                      <td style="background:#1e3a5f;padding:32px 40px;text-align:center;">
                        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;text-transform:uppercase;letter-spacing:2px;">Teacher Andrew</p>
                        <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Geography Study Guides</h1>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:40px;">
                        <p style="margin:0 0 20px;color:#334155;font-size:16px;line-height:1.6;">Hi ${firstName},</p>
                        <p style="margin:0 0 24px;color:#334155;font-size:16px;line-height:1.6;">
                          Welcome — you're now subscribed to free GCSE Geography study guides from Teacher Andrew. Every month I publish a new in-depth guide to help students master the topics that come up again and again in exams.
                        </p>

                        ${postHtml}

                        <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
                          If your child would benefit from personalised one-to-one lessons online, I'd love to help. You can view my availability and book directly through the portal below.
                        </p>
                        <a href="https://teacherandrewgeo.com/booking" style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;">Book a Free Trial Lesson</a>
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
          `,
        }),
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Subscribe error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to subscribe. Please try again.' }) };
  }
};
