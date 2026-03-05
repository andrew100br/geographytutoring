const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Fetching a profile to get a valid user_id...");
    const { data: profiles, error: profileErr } = await supabase.from('profiles').select('*').limit(1);

    if (profileErr) {
        console.error("Failed to fetch profiles:", profileErr);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log("No profiles found.");
        return;
    }

    const userId = profiles[0].id;
    console.log("Found user:", userId);

    console.log("\n--- Testing Admin Insert (is_from_admin = true) ---");
    const adminInsert = await supabase.from('messages').insert([{
        user_id: userId,
        content: "Test from Node",
        is_from_admin: true
    }]);
    console.log("Admin Insert Error:", adminInsert.error ? adminInsert.error.message : "Success");

    console.log("\n--- Testing Student Insert (is_from_admin = false) ---");
    const studentInsert = await supabase.from('messages').insert([{
        user_id: userId,
        content: "Test from Node (Student)",
        is_from_admin: false
    }]);
    console.log("Student Insert Error:", studentInsert.error ? studentInsert.error.message : "Success");
}

test();
