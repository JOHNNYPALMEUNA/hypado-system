const https = require('https');

const req = https.get('https://gvegucqwobfhxhkrgckm.supabase.co/rest/v1/projects?select=id&limit=1', {
    headers: {
        'apikey': 'sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv',
        'Authorization': 'Bearer sb_publishable_3mFDDlw0JvV-14DfbVz3aw_m1eQANNv'
    },
    timeout: 5000
}, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => console.log('Response status:', res.statusCode, '\nBody:', raw.slice(0, 100)));
});

req.on('timeout', () => {
    console.error('Request Timed Out (DB likely Paused or Unreachable)');
    req.destroy();
});

req.on('error', (e) => {
    console.error('Connection Error:', e.message);
});
