import { Component, OnInit, signal, inject, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { IntelligenceService, CourseDemand } from '../../../core/infrastructure/intelligence/intelligence.service';

@Component({
  selector: 'app-course-demand',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgxChartsModule],
  templateUrl: './course-demand.component.html',
})
export class CourseDemandComponent implements OnInit {
  private intelligenceService = inject(IntelligenceService);
  private platformId = inject(PLATFORM_ID);

  demands = signal<CourseDemand[]>([]);
  chartData = signal<any[]>([]);
  isLoading = signal(true);
  searchQuery = signal<string>('');
  filterStatus = signal<'ALL' | 'SHORTAGE' | 'SUFFICIENT'>('ALL');

  colorScheme: any = {
    domain: ['#2563EB', '#3B82F6', '#10B981', '#059669', '#0D9488', '#06B6D4', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B']
  };

  // Telemetry KPIs
  totalSubjects = computed(() => this.demands().length);
  
  totalProjectedDemand = computed(() =>
    this.demands().reduce((acc, curr) => acc + curr.projected_demand, 0)
  );

  totalCurrentEnrollment = computed(() =>
    this.demands().reduce((acc, curr) => acc + curr.current_enrollment, 0)
  );

  shortageCount = computed(() =>
    this.demands().filter(d => d.teacher_shortage).length
  );

  netGrowth = computed(() =>
    this.totalProjectedDemand() - this.totalCurrentEnrollment()
  );

  netGrowthPct = computed(() => {
    const curr = this.totalCurrentEnrollment();
    if (!curr) return 0;
    return Math.round(((this.totalProjectedDemand() - curr) / curr) * 100);
  });

  filteredDemands = computed(() => {
    let list = this.demands();
    const status = this.filterStatus();
    const query = this.searchQuery().trim().toLowerCase();

    if (status === 'SHORTAGE') {
      list = list.filter(d => d.teacher_shortage);
    } else if (status === 'SUFFICIENT') {
      list = list.filter(d => !d.teacher_shortage);
    }

    if (query) {
      list = list.filter(d =>
        d.subject_name.toLowerCase().includes(query) ||
        d.subject_id.toLowerCase().includes(query)
      );
    }

    return list;
  });

  topDemandedSubjects = computed(() => {
    return [...this.demands()]
      .sort((a, b) => b.projected_demand - a.projected_demand)
      .slice(0, 5);
  });

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadData();
    }
  }

  loadData() {
    this.isLoading.set(true);
    this.intelligenceService.getCourseDemand().subscribe({
      next: (demands) => {
        const list = demands || [];
        this.demands.set(list);
        const formatted = list.slice(0, 10).map(d => ({
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

  exportCSV() {
    const headers = 'Subject ID,Subject Name,Current Enrollment,Projected Demand,Growth,Staffing Status\n';
    const rows = this.filteredDemands().map(d => {
      const growth = d.projected_demand - d.current_enrollment;
      const status = d.teacher_shortage ? 'Shortage Alert' : 'Sufficient';
      return `"${d.subject_id}","${d.subject_name}",${d.current_enrollment},${d.projected_demand},${growth > 0 ? '+' + growth : growth},"${status}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SchoolLinx_Course_Demand_Forecast_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
