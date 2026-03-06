
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvegucqwobfhxhkrgckm.supabase.co';
const supabaseKey = 'sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('Sending invalid column to trigger hint...');
    const { error } = await supabase.from('projects').insert([{ trigger_hint_column_random_123: true }]);

    if (error) {
        console.log('FULL ERROR MESSAGE:', error.message);
        console.log('HINT:', error.hint);
        if (error.details) console.log('DETAILS:', error.details);
    } else {
        console.log('Surprisingly, it worked? (Unlikely)');
    }
}

inspect();
