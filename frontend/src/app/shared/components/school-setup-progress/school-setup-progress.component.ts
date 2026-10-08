import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TenantProfileService, SetupProgressResponse, SetupStep } from '../../../core/infrastructure/tenant-profile.service';

@Component({
  selector: 'app-school-setup-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './school-setup-progress.component.html',
  styleUrl: './school-setup-progress.component.css'
})
export class SchoolSetupProgressComponent implements OnInit {
  private tenantProfileService = inject(TenantProfileService);
  private router = inject(Router);

  isLoading = signal<boolean>(true);
  progressData = signal<SetupProgressResponse | null>(null);
  isCollapsed = signal<boolean>(false);
  activeTab = signal<string>('ALL'); // 'ALL' | 'PENDING' | 'Identity' | 'Curriculum' | 'Finance' | 'Community'

  pendingSteps = computed(() => {
    const data = this.progressData();
    if (!data) return [];
    return data.steps.filter(s => !s.completed);
  });

  completedSteps = computed(() => {
    const data = this.progressData();
    if (!data) return [];
    return data.steps.filter(s => s.completed);
  });

  nextRecommendedStep = computed(() => {
    const pending = this.pendingSteps();
    return pending.length > 0 ? pending[0] : null;
  });

  filteredSteps = computed(() => {
    const data = this.progressData();
    if (!data) return [];
    const tab = this.activeTab();
    if (tab === 'ALL') return data.steps;
    if (tab === 'PENDING') return data.steps.filter(s => !s.completed);
    return data.steps.filter(s => s.category.toLowerCase() === tab.toLowerCase());
  });

  categories = computed(() => {
    const data = this.progressData();
    if (!data) return [];
    const set = new Set(data.steps.map(s => s.category));
    return Array.from(set);
  });

  getCategoryCount(cat: string): number {
    const data = this.progressData();
    if (!data) return 0;
    if (cat === 'ALL') return data.steps.length;
    if (cat === 'PENDING') return this.pendingSteps().length;
    return data.steps.filter(s => s.category.toLowerCase() === cat.toLowerCase()).length;
  }

  getStageLabel(progress: number): string {
    if (progress === 100) return 'Institutional Readiness Complete';
    if (progress >= 75) return 'Final Operational Tuning';
    if (progress >= 50) return 'Academic & Fee Configuration';
    if (progress >= 25) return 'Foundational Curriculum Setup';
    return 'Initial Onboarding Kickoff';
  }

  ngOnInit(): void {
    this.loadSetupProgress();
  }

  loadSetupProgress(): void {
    this.isLoading.set(true);
    this.tenantProfileService.getSetupProgress().subscribe({
      next: (data) => {
        this.progressData.set(data);
        this.isLoading.set(false);
        // If 100% complete, default to collapsed
        if (data.is_complete) {
          this.isCollapsed.set(true);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: string): void {
    this.activeTab.set(tab);
  }

  toggleCollapse(): void {
    this.isCollapsed.set(!this.isCollapsed());
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
