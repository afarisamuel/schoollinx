const fs = require('fs');
const path = require('path');

const imgTag = `<img src="assets/images/app-icon.png" class="w-full h-full object-contain p-1" alt="School Linx Logo">`;

// Replacements map (regex patterns to replacement strings)
const replacements = [
    {
        // Public Layout Nav and Footer
        pattern: /<i class="fas fa-graduation-cap"><\/i>/g,
        replacement: imgTag
    },
    {
        // Login and Signup (SVG logo)
        pattern: /<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="24" height="24".*?<\/svg>/g,
        replacement: imgTag
    },
    {
        // Admin or Main layout if it uses fa-solid fa-graduation-cap
        pattern: /<i class="fa-solid fa-graduation-cap.*?><\/i>/g,
        replacement: imgTag
    }
];

function processHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    for (const rule of replacements) {
        content = content.replace(rule.pattern, rule.replacement);
    }
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated Logo in: ${filePath}`);
    }
}

function walk(dir) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath);
        } else if (filePath.endsWith('.html')) {
            processHtmlFile(filePath);
        }
    }
}

['src/app/features', 'src/app/shared', '../admin-frontend/src/app/features', '../admin-frontend/src/app/shared', '../admin-frontend/src/app/core'].forEach(dir => {
    if (fs.existsSync(dir)) walk(dir);
});

