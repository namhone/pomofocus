const fs = require('fs');

const p = 'src/components/MobileBottomNav.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/import\s*\{\s*Clock,\s*CheckSquare,\s*Volume2,/, 'import {\n  Timer,\n  ClipboardList,\n  Headphones,');
fs.writeFileSync(p, c, 'utf8');
console.log('Fixed imports in MobileBottomNav.tsx');
