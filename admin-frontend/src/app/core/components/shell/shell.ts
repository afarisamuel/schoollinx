import { Component, inject, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { CommandPaletteComponent } from '../command-palette/command-palette';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommandPaletteComponent],
  templateUrl: './shell.html',
  host: {
    'class': 'block h-full'
  }
})
export class ShellComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  themeService = inject(ThemeService);
  
  isMobileMenuOpen = false;
  private navSub?: Subscription;

  @ViewChild(CommandPaletteComponent) commandPalette?: CommandPaletteComponent;

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  ngOnInit() {
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.isMobileMenuOpen = false;
      });
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
  }

  openCommandPalette() {
    this.commandPalette?.toggle();
  }

  toggleMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  logout() {
    this.authService.logout();
  }
}
