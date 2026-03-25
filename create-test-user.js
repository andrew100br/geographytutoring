require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createConfirmedUser() {
  const email = 'end2end_test@example.com';
  const password = 'Password123!';

  console.log('Creating user:', email);
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes('already registered')) {
        console.log('User already exists, updating password and confirming email...');
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find(u => u.email === email);
        if (user) {
            await supabase.auth.admin.updateUserById(user.id, {
                password,
                email_confirm: true
            });
            console.log('Updated existing user successfully.');
            
            // Generate profile
            await supabase.from('profiles').upsert({
                id: user.id,
                email: email,
                parent_name: 'Test Parent',
                child_name: 'Test Child',
                country: 'UK',
                credits: 0
            });
        }
    } else {
        console.error('Error creating user:', error);
    }
  } else {
    console.log('User created:', data.user.id);
    
    // Create profile
    await supabase.from('profiles').insert({
        id: data.user.id,
        email: email,
        parent_name: 'Test Parent',
        child_name: 'Test Child',
        country: 'UK',
        credits: 0
    });
    console.log('Profile created.');
  }
}

createConfirmedUser();
