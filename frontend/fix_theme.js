const fs = require('fs');
const path = require('path');

const cssMap = {
    '#ffffff': 'var(--bg-primary)',
    '#fff': 'var(--bg-primary)',
    '#0f172a': 'var(--text-primary)',
    '#f8fafc': 'var(--bg-secondary)',
    '#475569': 'var(--text-secondary)',
    '#cbd5e1': 'var(--border-secondary)',
    '#64748b': 'var(--text-muted)',
    '#f1f5f9': 'var(--bg-tertiary)',
    'rgba(0,0,0,0.05)': 'var(--border-primary)',
    'rgba(0,0,0,0.03)': 'var(--border-primary)',
    'rgba(0,0,0,0.04)': 'var(--border-primary)',
    'rgba(0, 0, 0, 0.05)': 'var(--border-primary)',
    'rgba(255,255,255,0.85)': 'var(--bg-primary)',
    'rgba(255, 255, 255, 0.85)': 'var(--bg-primary)',
    'rgba(255,255,255,0.9)': 'var(--bg-primary)',
};

function processCssFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const [key, value] of Object.entries(cssMap)) {
        // global replacement without word boundaries because it's CSS
        content = content.split(key).join(value);
        // also try case-insensitive for hex codes
        if (key.startsWith('#')) {
             content = content.split(key.toUpperCase()).join(value);
        }
    }
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated CSS: ${filePath}`);
    }
}

// Map tailwind classes for HTML
const htmlMap = {
    'bg-[#0a0a0f]': 'bg-bg-primary',
    'bg-white': 'bg-bg-primary',
    'text-white': 'text-text-primary',
    'text-slate-900': 'text-text-primary',
    'text-slate-800': 'text-text-primary',
    'text-slate-700': 'text-text-secondary',
    'text-slate-600': 'text-text-secondary',
    'text-slate-500': 'text-text-muted',
    'bg-slate-50': 'bg-bg-secondary',
    'bg-slate-100': 'bg-bg-tertiary',
    'border-slate-100': 'border-border-primary',
    'border-slate-200': 'border-border-secondary',
    'bg-white/5': 'bg-bg-secondary', // Removed /50 for simplicity since they are theme vars
    'border-white/10': 'border-border-secondary',
    'border-white/5': 'border-border-primary',
    'text-white/80': 'text-text-secondary',
    'text-white/90': 'text-text-primary',
    'text-white/40': 'text-text-muted'
};

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function processHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    for (const [key, value] of Object.entries(htmlMap)) {
        // We can't use \b for things with brackets or slashes easily. 
        // Let's use a regex that checks for class boundaries (space or quote)
        const regex = new RegExp(`(?<=["\\s])` + escapeRegExp(key) + `(?=["\\s])`, 'g');
        content = content.replace(regex, value);
    }
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated HTML: ${filePath}`);
    }
}

function walk(dir) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath);
        } else if (filePath.endsWith('.css')) {
            processCssFile(filePath);
        } else if (filePath.endsWith('.html')) {
            processHtmlFile(filePath);
        }
    }
}

['src/app/features/public', 'src/app/features/landing', 'src/app/features/auth'].forEach(dir => {
    if (fs.existsSync(dir)) walk(dir);
});

