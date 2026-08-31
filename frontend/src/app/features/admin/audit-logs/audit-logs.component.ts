import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AuditService, AuditLog } from '../../../core/infrastructure/audit/audit.service';
import { PaginationState, defaultPaginationState } from '../../../core/domain/pagination.model';

@Component({
    selector: 'app-audit-logs',
    standalone: true,
    imports: [CommonModule, DatePipe],
    templateUrl: './audit-logs.component.html',
    styleUrl: './audit-logs.component.css'
})
export class AuditLogsComponent implements OnInit {
    private auditService = inject(AuditService);

    logs = signal<AuditLog[]>([]);
    pagination = signal<PaginationState>(defaultPaginationState());
    isLoading = signal<boolean>(true);

    ngOnInit(): void {
        this.loadLogs();
    }

    loadLogs(page: number = this.pagination().currentPage) {
        this.isLoading.set(true);
        this.auditService.getLogsPaginated(page, this.pagination().pageSize).subscribe({
            next: (res) => {
                this.logs.set(res.data || []);
                this.pagination.set({
                    currentPage: res.meta.current_page,
                    pageSize: res.meta.page_size,
                    totalCount: res.meta.total_count,
                    totalPages: res.meta.total_pages
                });
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
            }
        });
    }

    changePage(page: number) {
        if (page >= 1 && page <= this.pagination().totalPages) {
            this.loadLogs(page);
        }
    }
}
