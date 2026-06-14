import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvegucqwobfhxhkrgckm.supabase.co';
const supabaseKey = 'sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
    console.log('--- BEFORE DELETE ---');
    const { count: countBefore } = await supabase.from('projects').select('id', { count: 'exact' });
    console.log(`Projects count before delete: ${countBefore}`);

    console.log('\n--- ATTEMPTING DELETE ---');
    const { error: delError, status } = await supabase.from('projects').delete().neq('id', '0');
    if (delError) {
        console.error('Delete projects error:', delError.message);
    } else {
        console.log(`Delete projects finished with status ${status}`);
    }

    console.log('\n--- AFTER DELETE ---');
    const { count: countAfter } = await supabase.from('projects').select('id', { count: 'exact' });
    console.log(`Projects count after delete: ${countAfter}`);
}

testDelete();
