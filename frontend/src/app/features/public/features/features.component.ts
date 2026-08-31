import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-features',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './features.component.html',
    styleUrl: './features.component.css'
})
export class FeaturesComponent {
    modules = [
        {
            title: 'Academic Hub',
            icon: 'fa-book-reader',
            color: 'text-teal-400',
            bg: 'bg-teal-500/10',
            border: 'border-teal-500/20',
            items: ['Interactive Gradebooks', 'Automated Report Cards', 'Assignment Tracking', 'Curriculum Planning']
        },
        {
            title: 'Finance & Billing',
            icon: 'fa-file-invoice-dollar',
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20',
            items: ['Automated Fee Collection', 'Dynamic Payment Plans', 'Expense Tracking', 'Comprehensive Audits']
        },
        {
            title: 'HR & Payroll',
            icon: 'fa-user-tie',
            color: 'text-teal-400',
            bg: 'bg-teal-500/10',
            border: 'border-teal-500/20',
            items: ['Staff Attendance', 'Payroll Processing', 'Leave Management', 'Performance Reviews']
        },
        {
            title: 'Communication',
            icon: 'fa-comments',
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            items: ['Mass SMS & Email', 'Parent Portal', 'Teacher-Student Chat', 'Announcements']
        }
    ];
}
