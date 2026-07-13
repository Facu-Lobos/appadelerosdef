const fs = require('fs');
let file = 'src/components/MatchFlyerModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// Change VS text size
code = code.replace("text-[75px]", "text-[50px]");
code = code.replace("VS", "VS");

fs.writeFileSync(file, code);
console.log("VS size changed");
