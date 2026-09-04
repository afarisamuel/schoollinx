import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService, AuditLog } from '../../../core/infrastructure/audit/audit.service';
import { PaginationState, defaultPaginationState } from '../../../core/domain/pagination.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
    selector: 'app-audit-logs',
    standalone: true,
    imports: [CommonModule, DatePipe, FormsModule],
    templateUrl: './audit-logs.component.html',
    styleUrl: './audit-logs.component.css'
})
export class AuditLogsComponent implements OnInit {
    private auditService = inject(AuditService);
    private toast = inject(ToastService);

    logs = signal<AuditLog[]>([]);
    pagination = signal<PaginationState>(defaultPaginationState());
    isLoading = signal<boolean>(true);

    // Filter Signals
    searchQuery = signal<string>('');
    actionFilter = signal<'ALL' | 'CREATE' | 'UPDATE' | 'DELETE'>('ALL');
    entityTypeFilter = signal<string>('ALL');

    // Inspector Modal
    selectedLog = signal<AuditLog | null>(null);
    isInspectorOpen = signal<boolean>(false);
    copiedKey = signal<string | null>(null);

    // Available Entity Types for filtering
    availableEntityTypes = computed(() => {
        const types = new Set<string>();
        this.logs().forEach(l => {
            if (l.entity_type) types.add(l.entity_type.toUpperCase());
        });
        return Array.from(types).sort();
    });

    // Telemetry KPI Statistics
    totalEventsCount = computed(() => this.pagination().totalCount || this.logs().length);
    createEventsCount = computed(() => this.logs().filter(l => l.action === 'CREATE').length);
    updateEventsCount = computed(() => this.logs().filter(l => l.action === 'UPDATE').length);
    deleteEventsCount = computed(() => this.logs().filter(l => l.action === 'DELETE' || (l.action as string) === 'BULK_DELETE').length);
    uniqueActorsCount = computed(() => {
        const actors = new Set(this.logs().map(l => l.user_email).filter(Boolean));
        return actors.size;
    });

    // Filtered Logs
    filteredLogs = computed(() => {
        const q = this.searchQuery().toLowerCase().trim();
        const action = this.actionFilter();
        const entity = this.entityTypeFilter();

        return this.logs().filter(log => {
            // Action filter
            if (action !== 'ALL') {
                if (action === 'DELETE' && (log.action === 'DELETE' || (log.action as string) === 'BULK_DELETE')) {
                    // Match
                } else if (log.action !== action) {
                    return false;
                }
            }

            // Entity filter
            if (entity !== 'ALL' && log.entity_type?.toUpperCase() !== entity) {
                return false;
            }

            // Search query filter
            if (q) {
                const matchEmail = (log.user_email || '').toLowerCase().includes(q);
                const matchEntity = (log.entity_type || '').toLowerCase().includes(q);
                const matchEntityId = (log.entity_id || '').toLowerCase().includes(q);
                const matchIp = (log.ip_address || '').toLowerCase().includes(q);
                const matchChanges = (log.changes || '').toLowerCase().includes(q);
                const matchAction = (log.action || '').toLowerCase().includes(q);
                return matchEmail || matchEntity || matchEntityId || matchIp || matchChanges || matchAction;
            }

            return true;
        });
    });

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
                this.toast.error('Failed to retrieve system audit logs.', 'Audit Sync Error');
            }
        });
    }

    changePage(page: number) {
        if (page >= 1 && page <= this.pagination().totalPages) {
            this.loadLogs(page);
        }
    }

    openInspector(log: AuditLog) {
        this.selectedLog.set(log);
        this.isInspectorOpen.set(true);
    }

    closeInspector() {
        this.isInspectorOpen.set(false);
        this.selectedLog.set(null);
    }

    formatJsonPayload(raw: string): string {
        if (!raw || raw === '""' || raw === '"/"') return '// No payload delta registered';
        try {
            const parsed = JSON.parse(raw);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return raw;
        }
    }

    getSnippet(changes: string): string {
        if (!changes || changes === '""' || changes === '"/"' || changes === '/') return 'No payload delta';
        try {
            const parsed = JSON.parse(changes);
            if (Array.isArray(parsed)) {
                return `Batch modification of ${parsed.length} records`;
            }
            if (typeof parsed === 'object' && parsed !== null) {
                const keys = Object.keys(parsed);
                if (keys.length === 0) return 'Empty payload';
                return keys.slice(0, 3).map(k => `${k}: ${typeof parsed[k] === 'object' ? '{...}' : parsed[k]}`).join(' • ');
            }
            return String(parsed);
        } catch {
            return changes.length > 70 ? changes.slice(0, 70) + '...' : changes;
        }
    }

    copyToClipboard(text: string, key: string) {
        navigator.clipboard.writeText(text).then(() => {
            this.copiedKey.set(key);
            this.toast.success('Copied to clipboard!', 'Copy Success');
            setTimeout(() => this.copiedKey.set(null), 2000);
        });
    }

    exportToCSV() {
        const rows = this.filteredLogs();
        if (rows.length === 0) {
            this.toast.warning('No audit records to export.', 'Export Empty');
            return;
        }

        const headers = ['Timestamp', 'User Email', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Changes'];
        const csvContent = [
            headers.join(','),
            ...rows.map(r => [
                `"${r.created_at}"`,
                `"${r.user_email || 'System'}"`,
                `"${r.action}"`,
                `"${r.entity_type}"`,
                `"${r.entity_id || ''}"`,
                `"${r.ip_address || ''}"`,
                `"${(r.changes || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `schoollinx_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        this.toast.success(`Exported ${rows.length} audit logs to CSV`, 'Export Complete');
    }
}
