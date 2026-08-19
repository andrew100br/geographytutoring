const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { page } = JSON.parse(event.body || '{}');
    if (!page || page === '/admin') return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

    const country = event.headers['x-country'] || event.headers['cf-ipcountry'] || 'Unknown';

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    await supabase.from('page_views').insert([{ page, country }]);

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
