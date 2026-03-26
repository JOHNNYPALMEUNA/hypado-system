
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvegucqwobfhxhkrgckm.supabase.co';
const supabaseKey = 'sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log('Fetching daily_logs...');
    const { data, error } = await supabase.from('daily_logs').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        if (data && data.length > 0) {
            console.log('--- ALL COLUMNS IN PROJECTS ---');
            console.log(Object.keys(data[0]).sort().join('\n'));
            console.log('-------------------------------');
        } else {
            console.log('No data found in projects table.');
        }
    }
}

checkColumns();
