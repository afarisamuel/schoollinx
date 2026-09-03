import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jobs.html'
})
export class JobsComponent implements OnInit {
  private tenantService = inject(TenantService);

  jobs = signal<any[]>([]);
  isLoading = signal(false);
  triggeringJobId = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadJobs();
  }

  loadJobs() {
    this.isLoading.set(true);
    this.tenantService.getScheduledJobs().subscribe({
      next: (data) => {
        this.jobs.set(data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  runJob(job: any) {
    this.triggeringJobId.set(job.id);
    this.tenantService.runScheduledJob(job.id).subscribe({
      next: (res) => {
        this.triggeringJobId.set(null);
        this.successMessage.set(res.message || `Job '${job.name}' executed successfully`);
        this.loadJobs();
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.triggeringJobId.set(null);
        this.errorMessage.set('Failed to trigger job execution');
        setTimeout(() => this.errorMessage.set(null), 4000);
      }
    });
  }
}
