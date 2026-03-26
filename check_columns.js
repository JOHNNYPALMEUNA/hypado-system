
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvegucqwobfhxhkrgckm.supabase.co';
const supabaseKey = 'sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    for (const tableName of ['daily_logs', 'diary_logs']) {
        console.log(`Fetching ${tableName}...`);
        const { data, error } = await supabase.from(tableName).select('*').limit(1);

        if (error) {
            console.error(`Error fetching ${tableName}:`, error.message);
        } else {
            if (data && data.length > 0) {
                console.log(`--- ALL COLUMNS IN ${tableName.toUpperCase()} ---`);
                console.log(Object.keys(data[0]).sort().join('\n'));
                console.log('-------------------------------');
            } else {
                console.log(`No data found in ${tableName} table.`);
            }
        }
    }
}

checkColumns();
