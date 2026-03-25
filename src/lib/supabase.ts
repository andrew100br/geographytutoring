import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qgnqjzxjbdkcxjmgchen.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnbnFqenhqYmRrY3hqbWdjaGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNzc4OTQsImV4cCI6MjA4Nzk1Mzg5NH0.HM7PdwJOa1erI6n0w19Sq5ON9qmXh4wQrHh0D3or1Vg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
