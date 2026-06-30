const { createClient } = require('@supabase/supabase-js');

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
        // Already subscribed — treat as success so we don't reveal subscriber list
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }
      throw error;
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Subscribe error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to subscribe. Please try again.' }) };
  }
};
