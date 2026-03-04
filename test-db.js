const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function check() {
    const { data: messages, error } = await supabase.from('messages').select('*');
    console.log("Messages Error:", error);
    console.log("Messages Data:", messages);

    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    console.log("Profiles Error:", pError);
    console.log("Profiles Data:", profiles);
}

check();
