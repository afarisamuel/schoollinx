with open('frontend/src/app/features/dashboard/dashboard.component.html', 'r') as f:
    content = f.read()

# Replace the wrapper div class
content = content.replace(
    '<div cdkDrag [cdkDragDisabled]="!isEditMode()" class="relative group" [class.cursor-move]="isEditMode()">',
    '<div cdkDrag [cdkDragDisabled]="!isEditMode()" class="relative group h-full" [class.cursor-move]="isEditMode()" [ngClass]="getWidgetClass(widgetId)">'
)

# Remove bento-wide and bento-large from all child a tags
content = content.replace('bento-wide ', '')
content = content.replace('bento-large ', '')
content = content.replace(' bento-wide', '')
content = content.replace(' bento-large', '')

# Ensure the inner a tags take full height so they fill the wrapper grid cell
content = content.replace('class="bento-card', 'class="bento-card h-full')

with open('frontend/src/app/features/dashboard/dashboard.component.html', 'w') as f:
    f.write(content)
