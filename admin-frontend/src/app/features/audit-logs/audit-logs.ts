import { Component, inject, signal, ChangeDetectionStrategy, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AuditLog } from '../../core/services/admin.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditLogsComponent implements OnInit {
  private adminService = inject(AdminService);
  Math = Math; // Expose for template

  // State Signals
  logs = signal<AuditLog[]>([]);
  isLoading = signal(true);
  
  // Filtering & Sorting State
  searchQuery = signal('');
  actionFilter = signal('ALL');
  sortColumn = signal<keyof AuditLog | ''>('');
  sortDirection = signal<'asc' | 'desc'>('desc'); // Default to newest first

  // Pagination State
  currentPage = signal(1);
  pageSize = signal(15);

  // Unique actions for the filter dropdown
  uniqueActions = computed(() => {
    const actions = new Set(this.logs().map(log => log.action));
    return ['ALL', ...Array.from(actions).sort()];
  });

  // Derived filtered & sorted list
  filteredAndSortedLogs = computed(() => {
    let list = this.logs();

    // 1. Filter by Action
    const actionFilt = this.actionFilter();
    if (actionFilt !== 'ALL') {
      list = list.filter(log => log.action === actionFilt);
    }

    // 2. Filter by Search Query
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(log => 
        (log.actor_email || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.actor_id || '').toLowerCase().includes(q) ||
        JSON.stringify(log.metadata).toLowerCase().includes(q)
      );
    }

    // 3. Sort
    const col = this.sortColumn();
    const dir = this.sortDirection();
    if (col) {
       list = [...list].sort((a, b) => {
         const valA = String(a[col] || '');
         const valB = String(b[col] || '');
         return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
       });
    } else {
       // Default Sort by Date Descending
       list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return list;
  });

  // Derived Paginated List
  paginatedLogs = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredAndSortedLogs().slice(start, end);
  });

  // Total pages
  totalPages = computed(() => {
    return Math.ceil(this.filteredAndSortedLogs().length / this.pageSize()) || 1;
  });

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.isLoading.set(true);
    this.adminService.getAuditLogs().subscribe({
      next: (data) => {
        this.logs.set(data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.logs.set([]);
        this.isLoading.set(false);
      }
    });
  }

  // Sorting
  sort(col: keyof AuditLog) {
    if (this.sortColumn() === col) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(col);
      this.sortDirection.set('asc');
    }
    // Reset to page 1 on sort
    this.currentPage.set(1);
  }

  sortIcon(col: string): string {
    if (this.sortColumn() !== col) return '↕';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  // Pagination Methods
  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }
  
  onSearchChange(val: string) {
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onActionFilterChange(val: string) {
    this.actionFilter.set(val);
    this.currentPage.set(1);
  }

  // Format JSON Metadata Beautifully
  formatMetadata(metadata: any): string {
    if (!metadata) return '{}';
    if (typeof metadata === 'string') {
      try {
        const parsed = JSON.parse(metadata);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return metadata;
      }
    }
    return JSON.stringify(metadata, null, 2);
  }

  // Extract Tenant ID from metadata if it exists
  extractTargetEntity(metadata: any): string {
    if (!metadata) return 'Global System';
    
    let md = metadata;
    if (typeof metadata === 'string') {
      try { md = JSON.parse(metadata); } catch { return 'Global System'; }
    }
    
    return md.tenant_id || md.tenantId || md.organization_id || 'Global System';
  }

  // Export to CSV
  exportToCSV() {
    const data = this.filteredAndSortedLogs();
    if (data.length === 0) return;

    const headers = ['ID', 'Action', 'Actor Email', 'Actor ID', 'Target Entity', 'Metadata', 'Timestamp'];
    
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [headers.join(',')];
    
    data.forEach(log => {
      const row = [
        escapeCSV(log.id),
        escapeCSV(log.action),
        escapeCSV(log.actor_email),
        escapeCSV(log.actor_id),
        escapeCSV(this.extractTargetEntity(log.metadata)),
        escapeCSV(typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata)),
        escapeCSV(log.created_at)
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_ledger_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  }
}
