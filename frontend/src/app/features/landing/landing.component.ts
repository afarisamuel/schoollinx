import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ScrollReveal } from '../../shared/directives/scroll-reveal';
import { SeoService } from '../../shared/services/seo';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterModule, ScrollReveal],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
    currentYear = new Date().getFullYear();

    constructor(private seo: SeoService) {}

    ngOnInit() {
      this.seo.updateMeta('One Platform. Every School.', 'School Linx gives schools a beautiful, intelligent management system — students, staff, grades, fees, and insights — powered by a single platform your entire faculty will love.', '/');
    }

    features = [
        {
            icon: 'fa-users-class',
            title: 'Student Management',
            desc: 'Complete student lifecycle — enrollment, profiles, attendance, performance — all in one place.'
        },
        {
            icon: 'fa-chalkboard-teacher',
            title: 'Teacher & HR',
            desc: 'Manage staff, payroll, roles, and performance evaluations with surgical precision.'
        },
        {
            icon: 'fa-chart-line',
            title: 'Smart Analytics',
            desc: 'AI-powered insights on grades, attendance trends, and school-wide performance metrics.'
        },
        {
            icon: 'fa-file-invoice-dollar',
            title: 'Fiscal Intelligence',
            desc: 'Automate fee collection, billing, budgets, and financial reporting effortlessly.'
        },
        {
            icon: 'fa-clock',
            title: 'Timetable Engine',
            desc: 'Generate conflict-free timetables automatically and publish them instantly.'
        },
        {
            icon: 'fa-shield-check',
            title: 'Role-Based Access',
            desc: 'Granular permissions for admins, teachers, parents, and students — fully isolated per school.'
        }
    ];

    stats = [
        { value: '500+', label: 'Schools Onboarded' },
        { value: '120K+', label: 'Students Managed' },
        { value: '99.9%', label: 'Uptime SLA' },
        { value: '4.9★', label: 'Average Rating' }
    ];
}
