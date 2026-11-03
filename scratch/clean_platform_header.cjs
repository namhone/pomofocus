const fs = require('fs');

const headerPath = 'src/components/PlatformHeader.tsx';
let content = fs.readFileSync(headerPath, 'utf8');

// Find the duplicate block between first </div>\n      </div> and {/* Confirm Logout Dialog
const regex = /(<User size=\{15\} className="shrink-0" \/>\s*<span>Đăng Nhập \/ Đăng Ký<\/span>\s*<\/button>\s*\)}\s*<\/div>\s*<\/div>)[\s\S]*?(\{\/\* Confirm Logout Dialog \(Modal\) \*\/)/;

content = content.replace(regex, '$1\n\n      $2');
fs.writeFileSync(headerPath, content, 'utf8');
console.log('Cleaned duplicate block successfully!');
