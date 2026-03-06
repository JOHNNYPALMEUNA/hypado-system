
import { supabase } from './supabaseClient';

async function listColumns() {
    console.log('--- Fetching Projects Table Columns ---');

    // We can't query information_schema directly with the client easily,
    // but we can try to get one row and see the keys.
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error.message);
        // If it fails, let's try a describe-like approach by sending an empty insert
        console.log('Trying to trigger a column hint error...');
        const { error: insertError } = await supabase.from('projects').insert([{ non_existent_column_for_debug: true }]);
        console.log('Hint error:', insertError?.message);
    } else if (data && data.length > 0) {
        console.log('Found row. Columns:', Object.keys(data[0]));
    } else {
        console.log('No rows found to inspect columns.');
        // Try to insert an empty object to see what happens
        const { data: newData, error: newError } = await supabase.from('projects').insert([{}]).select();
        if (newData && newData.length > 0) {
            console.log('New row columns:', Object.keys(newData[0]));
        } else {
            console.error('Could not determine columns. Error:', newError?.message);
        }
    }
}

listColumns();
