import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvegucqwobfhxhkrgckm.supabase.co';
const supabaseKey = 'sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
    console.log('--- TESTING NEW DELETE FILTER (.not(id, is, null)) ---');
    const tables = ['daily_logs', 'timeline_events', 'projects'];

    for (const table of tables) {
        try {
            console.log(`\nTesting delete on ${table}...`);
            const { error, status, statusText } = await supabase
                .from(table)
                .delete()
                .not('id', 'is', null);
            
            if (error) {
                console.error(`❌ Error on ${table}:`, error.message);
            } else {
                console.log(`✅ Success on ${table} - Status: ${status} (${statusText})`);
            }
        } catch (e) {
            console.error(`💥 Exception on ${table}:`, e.message);
        }
    }
}

testDelete();
