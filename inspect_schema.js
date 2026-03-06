
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvegucqwobfhxhkrgckm.supabase.co';
const supabaseKey = 'sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv';

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceInspect() {
    console.log('Attempting minimal insert into projects...');
    // We need a valid clientId for RLS if it checks existence, 
    // but usually Auth Access Projects policy is TO authenticated USING (true)
    // so it might just work with any data.
    const dummyId = 'debug-' + Date.now();

    // We try to insert into ANY known column. id is safest.
    const { data, error } = await supabase
        .from('projects')
        .insert([{ id: dummyId, workName: 'DEBUG_COLUMNS' }])
        .select();

    if (error) {
        console.error('Minimal Insert Error:', error.message);
        if (error.hint) console.log('Hint:', error.hint);
        if (error.details) console.log('Details:', error.details);
    } else if (data && data.length > 0) {
        console.log('Got data! Real columns are:', Object.keys(data[0]).sort());
        // Clean up
        await supabase.from('projects').delete().eq('id', dummyId);
    } else {
        console.log('Insert succeeded but no data returned. Possibly RLS hiding it after insert?');
        // Try to fetch it regardless
        const { data: fetchResult } = await supabase.from('projects').select('*').limit(1);
        if (fetchResult && fetchResult.length > 0) {
            console.log('Fetched row keys:', Object.keys(fetchResult[0]).sort());
        } else {
            console.log('Still no data. Table might be totally restricted or empty.');
        }
    }
}

forceInspect();
