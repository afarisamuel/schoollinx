import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService, Tenant } from '../../core/services/tenant.service';

@Component({
  selector: 'app-tenant-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './tenant-notes.html'
})
export class TenantNotesComponent implements OnInit {
  private tenantService = inject(TenantService);

  tenants = signal<Tenant[]>([]);
  selectedTenantId = signal<string>('');
  notes = signal<any[]>([]);
  isLoadingTenants = signal(true);
  isLoadingNotes = signal(false);
  isSubmitting = signal(false);

  newNoteContent = signal('');
  newNoteCategory = signal('GENERAL');
  newNoteAuthor = signal('');

  selectedTenant = computed(() => {
    return this.tenants().find(t => t.id === this.selectedTenantId()) || null;
  });

  ngOnInit() {
    this.tenantService.getTenants().subscribe({
      next: (data) => {
        this.tenants.set(data || []);
        if (data && data.length > 0) {
          this.selectTenant(data[0].id);
        }
        this.isLoadingTenants.set(false);
      },
      error: () => this.isLoadingTenants.set(false)
    });
  }

  selectTenant(id: string) {
    this.selectedTenantId.set(id);
    this.isLoadingNotes.set(true);
    this.tenantService.getTenantNotes(id).subscribe({
      next: (data) => {
        this.notes.set(data || []);
        this.isLoadingNotes.set(false);
      },
      error: () => {
        this.notes.set([]);
        this.isLoadingNotes.set(false);
      }
    });
  }

  submitNote() {
    const text = this.newNoteContent().trim();
    if (!text || !this.selectedTenantId()) return;

    this.isSubmitting.set(true);
    this.tenantService.addTenantNote(this.selectedTenantId(), {
      content: text,
      category: this.newNoteCategory(),
      author: this.newNoteAuthor() || 'SuperAdmin'
    }).subscribe({
      next: (saved) => {
        this.notes.update(list => [saved, ...list]);
        this.newNoteContent.set('');
        this.isSubmitting.set(false);
      },
      error: () => this.isSubmitting.set(false)
    });
  }
}
