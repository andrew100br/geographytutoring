// This file initializes the Supabase client for the frontend
const SUPABASE_URL = 'https://qgnqjzxjbdkcxjmgchen.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnbnFqenhqYmRrY3hqbWdjaGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNzc4OTQsImV4cCI6MjA4Nzk1Mzg5NH0.HM7PdwJOa1erI6n0w19Sq5ON9qmXh4wQrHh0D3or1Vg';

// Initialize the Supabase client by redefining the global variable
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
