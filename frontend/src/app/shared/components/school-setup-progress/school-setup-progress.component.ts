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

  ngOnInit(): void {
    this.loadSetupProgress();
  }

  loadSetupProgress(): void {
    this.isLoading.set(true);
    this.tenantProfileService.getSetupProgress().subscribe({
      next: (data) => {
        this.progressData.set(data);
        this.isLoading.set(false);
        // Auto-collapse if 100% complete to save screen real estate
        if (data.is_complete) {
          this.isCollapsed.set(true);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  toggleCollapse(): void {
    this.isCollapsed.set(!this.isCollapsed());
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
