const fs = require('fs');
const path = require('path');

const srcDir = 'F:/open-design/apps/daemon/src/runtimes/defs';
const files = fs.readdirSync(srcDir);
const clis = files.filter(f => f.endsWith('.ts') && f !== 'shared.ts').map(f => f.replace('.ts', ''));

console.log(clis.join(', '));
