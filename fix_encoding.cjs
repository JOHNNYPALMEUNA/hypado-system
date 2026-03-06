const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    const map = {
        'ðŸ“‹': '📋',
        'ðŸ“…': '📅',
        'ðŸ› ï¸ ': '🛠️',
        'ðŸ“¸': '📸',
        'ðŸ”—': '🔗',
        'ðŸ ­': '🏭',
        'ðŸ ¢': '🏢',
        'ðŸ‘·â€ â™‚ï¸ ': '👷‍♂️',
        'ðŸ’°': '💰',
        'ðŸšš': '🚚',
        'ðŸ“ ': '📍',
        'ðŸ‘¤': '👤',
        'ðŸ’¬': '💬',
        'ðŸ —ï¸ ': '🏗️',
        'ðŸ”’': '🔒',
        'ðŸš§': '🚧',
        'ðŸ”§': '🔧',
        'ðŸš€': '🚀',
        'ðŸ”„': '🔄',
        'OCORRÃŠNCIA': 'OCORRÊNCIA',
        'CÃ LCULO': 'CÁLCULO',
        'ASSISTÃŠNCIA': 'ASSISTÊNCIA',
        'OBSERVAÇÃ•ES': 'OBSERVAÇÕES',
        'ASSISTÃŠNCIAS': 'ASSISTÊNCIAS',
        'AÇÃ•ES': 'AÇÕES'
    };

    for (const [bad, good] of Object.entries(map)) {
        if (content.includes(bad)) {
            content = content.split(bad).join(good);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed', file);
    }
});
