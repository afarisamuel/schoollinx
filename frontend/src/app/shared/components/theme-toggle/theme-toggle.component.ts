import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../../core/infrastructure/theme/theme.service';

@Component({
    selector: 'app-theme-toggle',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './theme-toggle.component.html',
    styleUrl: './theme-toggle.component.css'
})
export class ThemeToggleComponent {
    private themeService = inject(ThemeService);
    theme = this.themeService.theme;

    toggleTheme() {
        this.themeService.toggleTheme();
    }
}
