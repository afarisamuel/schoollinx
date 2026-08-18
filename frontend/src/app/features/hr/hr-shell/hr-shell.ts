import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-hr-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './hr-shell.html',
  styleUrl: './hr-shell.css',
})
export class HrShell {}
