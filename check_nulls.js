
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvegucqwobfhxhkrgckm.supabase.co';
const supabaseKey = 'sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNulls() {
    console.log('Checking for null status...');
    const { count, error } = await supabase
        .from('technical_assistance')
        .select('*', { count: 'exact', head: true })
        .is('status', null);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Rows with null status:', count);
    }
}

checkNulls();
