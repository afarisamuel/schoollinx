import re

with open("src/app/features/extracurricular/club-discovery/club-discovery.component.html", "r") as f:
    html = f.read()

# Replacements
html = re.sub(r'\btext-white\b', 'text-text-primary', html)
html = re.sub(r'\bborder-white/[0-9]+\b', 'border-border-primary', html)
html = re.sub(r'\bbg-white/10\b', 'bg-border-primary', html)
html = re.sub(r'\bbg-white/5\b', 'bg-border-primary', html)
html = re.sub(r'\bbg-white\b', 'bg-bg-primary', html) # e.g. for pills
html = re.sub(r'\btext-black\b', 'text-text-primary', html) # inverse text

with open("src/app/features/extracurricular/club-discovery/club-discovery.component.html", "w") as f:
    f.write(html)
