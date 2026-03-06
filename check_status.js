
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvegucqwobfhxhkrgckm.supabase.co';
const supabaseKey = 'sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    console.log('Checking statuses...');
    const { data, error } = await supabase
        .from('technical_assistance')
        .select('status');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Total rows:', data.length);
        const statuses = data.map(r => r.status);
        // Count frequencies
        const counts = {};
        statuses.forEach(s => {
            const key = s === null ? 'NULL' : (s === undefined ? 'UNDEFINED' : s);
            counts[key] = (counts[key] || 0) + 1;
        });
        console.log('Status Counts:', JSON.stringify(counts, null, 2));
    }
}

checkStatus();
