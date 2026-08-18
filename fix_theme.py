import re

# Fix HTML
with open('frontend/src/app/features/dashboard/dashboard.component.html', 'r') as f:
    html = f.read()

html = html.replace('text-white', 'text-text-primary')
html = html.replace('bg-gradient-to-br from-white to-white/50', 'bg-gradient-to-br from-text-primary to-text-primary/50')
html = html.replace('bg-white/5', 'bg-bg-tertiary')
html = html.replace('hover:text-white', 'hover:text-text-primary')
html = html.replace('hover:bg-white/10', 'hover:bg-bg-secondary')
html = html.replace('border-white/10', 'border-border-primary')

with open('frontend/src/app/features/dashboard/dashboard.component.html', 'w') as f:
    f.write(html)

# Fix CSS
with open('frontend/src/app/features/dashboard/dashboard.component.css', 'r') as f:
    css = f.read()

css = css.replace('rgba(255, 255, 255, 0.08)', 'var(--border-primary)')
css = css.replace('rgba(255, 255, 255, 0.15)', 'var(--border-primary)')
css = css.replace('linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', 'var(--bg-secondary)')
css = css.replace('rgba(255, 255, 255, 0.03)', 'var(--bg-secondary)')
css = css.replace('rgba(255, 255, 255, 0.05)', 'var(--border-primary)')
css = css.replace('rgba(255, 255, 255, 0.06)', 'var(--bg-tertiary)')
css = css.replace('rgba(0, 0, 0, 0.2)', 'var(--bg-tertiary)')

# Fix KPI Pill specifically
css = css.replace('''
.kpi-pill {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    backdrop-filter: blur(10px);
    border-radius: 100px;
    padding: 8px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    transition: background 0.3s ease;
}
.kpi-pill:hover {
    background: var(--bg-tertiary);
}
''', '''
.kpi-pill {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    backdrop-filter: blur(10px);
    border-radius: 100px;
    padding: 8px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    transition: background 0.3s ease;
}
.kpi-pill:hover {
    background: var(--bg-tertiary);
}
''')

with open('frontend/src/app/features/dashboard/dashboard.component.css', 'w') as f:
    f.write(css)

