import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-pricing',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './pricing.component.html',
    styleUrl: './pricing.component.css'
})
export class PricingComponent {
    studentCount: number = 500;
    hourlyRate: number = 25;

    get hoursSavedPerMonth(): number {
        // Assume saving 2 hours per student per year, so per month:
        return Math.round((this.studentCount * 2) / 12);
    }

    get moneySavedPerMonth(): number {
        return this.hoursSavedPerMonth * this.hourlyRate;
    }
}
