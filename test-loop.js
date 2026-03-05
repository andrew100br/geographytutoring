import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testFetch() {
    const userId = '954ddff8-5425-46d1-8c3d-3c5ff519d11c';
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    console.log("Found", messages.length, "messages");

    // Simulate DOM
    try {
        messages.forEach(msg => {
            const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(msg.created_at).toLocaleDateString();
            if (typeof timeStr !== 'string') throw new Error("timeStr failed");
        });
        console.log("No syntax crash during loop.");
    } catch (e) {
        console.error("Crash during loop:", e);
    }
}
testFetch();
