import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://gvegucqwobfhxhkrgckm.supabase.co',
    'sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv'
);

async function check() {
    console.log('Sending select WITHOUT avatar...');
    const { data, error } = await supabase.from('installers').select('id, name, cpf, phone, role, status, specialty, observations');
    if (error) {
        console.log('SELECT ERROR:', error);
    } else {
        console.log(`SELECT SUCCESS: ${data.length} records found`);
        console.log('First installer stats:', JSON.stringify(data[0], null, 2));
    }
}

check();
