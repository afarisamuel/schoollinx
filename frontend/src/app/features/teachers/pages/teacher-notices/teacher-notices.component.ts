import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeacherPortalService } from '../../../../core/infrastructure/teacher/teacher-portal.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-teacher-notices',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './teacher-notices.component.html'
})
export class TeacherNoticesComponent implements OnInit {
  private portalService = inject(TeacherPortalService);
  private toast = inject(ToastService);

  isLoading = signal(true);
  notices = signal<any[]>([]);
  teacher = signal<any>(null);

  noticeTitle = signal('');
  noticeContent = signal('');
  noticeAudience = signal('ALL');
  noticeExpires = signal('');
  isPosting = signal(false);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.portalService.getNotices().subscribe({
      next: (data) => {
        this.notices.set(data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  postNotice() {
    if (!this.noticeTitle() || !this.noticeContent()) {
      this.toast.error('Please provide both notice title and announcement content.');
      return;
    }

    this.isPosting.set(true);
    const payload = {
      title: this.noticeTitle(),
      content: this.noticeContent(),
      target: this.noticeAudience()
    };

    this.portalService.createNotice(payload).subscribe({
      next: () => {
        this.isPosting.set(false);
        this.noticeTitle.set('');
        this.noticeContent.set('');
        this.noticeExpires.set('');
        this.toast.success('Announcement broadcasted to bulletin board.', 'Notice Published');
        this.loadData();
      },
      error: () => {
        this.isPosting.set(false);
        this.toast.error('Failed to broadcast notice.');
      }
    });
  }
}
