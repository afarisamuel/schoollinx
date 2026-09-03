import { Component, inject, signal, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService, Tenant } from '../../services/tenant.service';
import { AVAILABLE_MODULES } from '../../../features/feature-flags/feature-flags';

@Component({
  selector: 'app-tenant-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './tenant-drawer.html'
})
export class TenantDrawerComponent implements OnChanges {
  private tenantService = inject(TenantService);

  @Input() tenant: Tenant | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() tenantUpdated = new EventEmitter<void>();

  activeTab = signal<'OVERVIEW' | 'ONBOARDING' | 'FLAGS' | 'NOTES' | 'BILLING'>('OVERVIEW');

  // Flags state
  availableModules = AVAILABLE_MODULES;
  currentFlags = signal<Record<string, boolean>>({});
  isLoadingFlags = signal(false);
  isSavingFlags = signal(false);

  // Notes state
  notes = signal<any[]>([]);
  isLoadingNotes = signal(false);
  newNoteText = signal('');
  newNoteCat = signal('GENERAL');
  isSavingNote = signal(false);

  // Onboarding state
  onboardingStatus = signal<any | null>(null);
  isLoadingOnboarding = signal(false);

  successMsg = signal('');
  errorMsg = signal('');

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen && this.tenant) {
      this.loadAllDrawerData();
    }
  }

  loadAllDrawerData() {
    if (!this.tenant) return;
    const id = this.tenant.id;

    // Load flags
    this.isLoadingFlags.set(true);
    this.tenantService.getFeatureFlags(id).subscribe({
      next: (res) => {
        const flags: Record<string, boolean> = {};
        for (const mod of this.availableModules) {
          flags[mod.key] = res.feature_flags && res.feature_flags[mod.key] !== undefined
            ? res.feature_flags[mod.key]
            : true;
        }
        this.currentFlags.set(flags);
        this.isLoadingFlags.set(false);
      },
      error: () => this.isLoadingFlags.set(false)
    });

    // Load notes
    this.isLoadingNotes.set(true);
    this.tenantService.getTenantNotes(id).subscribe({
      next: (data) => {
        this.notes.set(data || []);
        this.isLoadingNotes.set(false);
      },
      error: () => this.isLoadingNotes.set(false)
    });

    // Load onboarding status
    this.isLoadingOnboarding.set(true);
    this.tenantService.getOnboardingStatus(id).subscribe({
      next: (data) => {
        this.onboardingStatus.set(data);
        this.isLoadingOnboarding.set(false);
      },
      error: () => this.isLoadingOnboarding.set(false)
    });
  }

  toggleModule(key: string) {
    const cur = this.currentFlags();
    this.currentFlags.set({
      ...cur,
      [key]: !cur[key]
    });
  }

  saveFlags() {
    if (!this.tenant) return;
    this.isSavingFlags.set(true);
    this.tenantService.updateFeatureFlags(this.tenant.id, this.currentFlags()).subscribe({
      next: () => {
        this.isSavingFlags.set(false);
        this.showSuccess('Feature flags updated');
      },
      error: () => {
        this.isSavingFlags.set(false);
        this.showError('Failed to update feature flags');
      }
    });
  }

  addNote() {
    if (!this.tenant || !this.newNoteText().trim()) return;
    this.isSavingNote.set(true);
    this.tenantService.addTenantNote(this.tenant.id, {
      content: this.newNoteText().trim(),
      category: this.newNoteCat()
    }).subscribe({
      next: (note) => {
        this.notes.update(list => [note, ...list]);
        this.newNoteText.set('');
        this.isSavingNote.set(false);
        this.showSuccess('CRM note recorded');
      },
      error: () => {
        this.isSavingNote.set(false);
        this.showError('Failed to record note');
      }
    });
  }

  showSuccess(msg: string) {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 3000);
  }

  showError(msg: string) {
    this.errorMsg.set(msg);
    setTimeout(() => this.errorMsg.set(''), 3000);
  }
}
