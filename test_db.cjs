const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gvegucqwobfhxhkrgckm.supabase.co', 'sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv');

async function checkDb() {
    try {
        console.log("Checking DB...");
        const { count, error } = await supabase.from('projects').select('id', { count: 'exact', head: true });
        if (error) {
            console.error("DB Error:", error);
        } else {
            console.log("Projects Count:", count);
        }
    } catch (e) {
        console.error("Catch Error:", e);
    } finally {
        process.exit(0);
    }
}

checkDb();
