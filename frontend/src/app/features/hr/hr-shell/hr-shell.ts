import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-hr-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './hr-shell.html',
  styleUrl: './hr-shell.css',
})
export class HrShell {
  readonly navLinks = [
    { label: 'Overview', route: '/hr', exact: true, icon: 'overview' },
    { label: 'Staff Registry', route: '/hr/staff', exact: false, icon: 'staff' },
    { label: 'Payroll & Taxes', route: '/hr/payroll', exact: false, icon: 'payroll' },
    { label: 'Leave Manager', route: '/hr/leave', exact: false, icon: 'leave' },
    { label: 'Attendance', route: '/hr/attendance', exact: false, icon: 'attendance' },
    { label: 'Performance', route: '/hr/performance', exact: false, icon: 'performance' },
    { label: 'Development', route: '/hr/development', exact: false, icon: 'development' },
  ];
}
