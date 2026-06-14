import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvegucqwobfhxhkrgckm.supabase.co';
const supabaseKey = 'sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv';
const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
    'clients',
    'projects',
    'company_settings',
    'daily_logs',
    'events',
    'installers',
    'materials',
    'purchase_orders',
    'suppliers',
    'tasks',
    'technical_assistance',
    'timeline_events',
    'refund_requests'
];

async function checkAllCounts() {
    console.log('--- Database Row Counts ---');
    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                console.log(`Table ${table}: Error - ${error.message}`);
            } else {
                console.log(`Table ${table}: ${count} rows`);
            }
        } catch (e) {
            console.log(`Table ${table}: Exception - ${e.message}`);
        }
    }
}

checkAllCounts();
