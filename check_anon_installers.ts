import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInstallers() {
    console.log('--- Fetching Installers Table as Anon ---');
    const { data, error } = await supabase.from('installers').select('*').limit(1);

    if (error) {
        console.error('Error fetching data:', error.message);
    } else if (data && data.length > 0) {
        console.log('Found row. Columns:', Object.keys(data[0]));
        console.log('Data:', data[0]);
    } else {
        console.log('No rows returned. RLS might be blocking or table is empty.');
    }
}

checkInstallers();
