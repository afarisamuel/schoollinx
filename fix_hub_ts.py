with open('frontend/src/app/features/hub/hub-page.component.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "const classes = ['metro-tile', 'animate-metro-in', 'bg-bg-secondary'];",
    "const classes = ['bento-card', 'animate-bento-in'];"
)
content = content.replace("classes.push('tile-wide');", "classes.push('bento-wide');")
content = content.replace("classes.push('tile-large');", "classes.push('bento-large');")
content = content.replace("classes.push('tile-tall');", "classes.push('bento-tall');")

with open('frontend/src/app/features/hub/hub-page.component.ts', 'w') as f:
    f.write(content)
