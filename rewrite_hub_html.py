with open('frontend/src/app/features/hub/hub-page.component.html', 'r') as f:
    content = f.read()

# Replace bg-primary
content = content.replace('bg-primary', 'bg-bg-primary')

# Replace metro grid with bento grid
content = content.replace('<div class="metro-grid">', '<div class="bento-grid">')

# Update the tile content
old_tile_block = '''<div class="tile-content">
          <svg
            class="tile-icon w-9 h-9"
            [style.color]="tile.color"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path [attr.d]="tile.icon" />
          </svg>
          <div>
            <h3 class="text-base font-semibold leading-tight">{{ tile.label }}</h3>
            @if (tile.subtitle) {
            <p class="text-text-primary/55 text-[10px] font-bold tracking-wider
uppercase mt-1">
              {{ tile.subtitle }}
            </p>
            }
          </div>
        </div>'''

new_tile_block = '''<div class="bento-content">
          <div class="flex justify-between items-start mb-4">
            <div class="bento-icon">
              <svg
                class="w-8 h-8"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path [attr.d]="tile.icon" />
              </svg>
            </div>
          </div>
          <div class="mt-auto">
            <h3 class="text-lg font-bold text-text-primary mb-1">{{ tile.label }}</h3>
            @if (tile.subtitle) {
              <p class="text-xs text-text-primary/60 font-medium">
                {{ tile.subtitle }}
              </p>
            }
          </div>
        </div>'''

# We also need to add the inline styles for the CSS variables on the <a> tag
# Find the <a> tag
a_tag = '''<a
        [routerLink]="tile.route"
        [class]="getTileClass(tile)"
        [style.animation-delay.ms]="50 + (i * 60)"
      >'''
a_tag_new = '''<a
        [routerLink]="tile.route"
        [class]="getTileClass(tile)"
        [style.animation-delay.ms]="50 + (i * 60)"
        [style.--glow-color]="tile.color + '33'"
        [style.--glow-color-dim]="tile.color + '1A'"
        [style.--icon-color]="tile.color"
      >'''

content = content.replace(old_tile_block, new_tile_block)
content = content.replace(a_tag, a_tag_new)

# Update some header animations
content = content.replace('animate-metro-in', 'animate-bento-in')
content = content.replace('tile-delay-1', 'delay-1')

with open('frontend/src/app/features/hub/hub-page.component.html', 'w') as f:
    f.write(content)
