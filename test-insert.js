const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qgnqjzxjbdkcxjmgchen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnbnFqenhqYmRrY3hqbWdjaGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNzc4OTQsImV4cCI6MjA4Nzk1Mzg5NH0.HM7PdwJOa1erI6n0w19Sq5ON9qmXh4wQrHh0D3or1Vg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Creating test user...");
    const email = `test_${Date.now()}@example.com`;
    const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: email,
        password: 'password123'
    });

    if (signupError) {
        console.error("Signup error:", signupError.message);
        return;
    }

    const userId = authData.user.id;
    console.log("User created with ID:", userId);

    console.log("Creating profile to satisfy foreign key...");
    const { error: profileError } = await supabase.from('profiles').insert([{
        id: userId,
        email: email,
        parent_name: "Test Parent",
        child_name: "Test Child",
        country: "UK",
        credits: 10
    }]);

    if (profileError) {
        console.error("Profile error:", profileError.message);
        return; // If we can't create profile, we might still fail message because of FK
    }

    console.log("Attempting to insert message as student...");
    const { data, error: msgError } = await supabase.from('messages').insert([{
        user_id: userId,
        content: 'Test message',
        is_from_admin: false
    }]);

    console.log("Message Insert Result:");
    if (msgError) {
        console.error(msgError);
    } else {
        console.log("Success!", data);
    }
}

run();
