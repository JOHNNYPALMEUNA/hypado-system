
const { createClient } = require('@supabase/supabase-js');

// Hardcoded for this verification based on previous session
const supabaseUrl = 'https://gvegucqwobfhxhkrgckm.supabase.co';
const supabaseKey = 'sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
    console.log('Checking if project_pdf_url column exists...');

    // Attempt to select the column. If it doesn't exist, it should error.
    const { data, error } = await supabase
        .from('projects')
        .select('project_pdf_url')
        .limit(1);

    if (error) {
        console.error('Column likely MISSING. Error:', error.message);
    } else {
        console.log('Column EXISTS. Data returned:', data);
    }
}

checkColumn();
