import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { IntelligenceService, CourseDemand } from '../../../core/infrastructure/intelligence/intelligence.service';

@Component({
    selector: 'app-course-demand',
    standalone: true,
    imports: [CommonModule, RouterModule, NgxChartsModule],
    templateUrl: './course-demand.component.html',
})
export class CourseDemandComponent implements OnInit {
    private intelligenceService = inject(IntelligenceService);
    private platformId = inject(PLATFORM_ID);

    demands = signal<CourseDemand[]>([]);
    chartData = signal<any[]>([]);
    isLoading = signal(true);

    colorScheme: any = {
        domain: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#06b6d4']
    };

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadData();
        }
    }

    loadData() {
        this.isLoading.set(true);
        this.intelligenceService.getCourseDemand().subscribe({
            next: (demands) => {
                this.demands.set(demands || []);
                const formatted = (demands || []).slice(0, 10).map(d => ({
                    name: d.subject_name,
                    value: d.projected_demand
                }));
                this.chartData.set(formatted);
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
            }
        });
    }
}
