import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlumniService, AlumniLegacy } from '../../../core/infrastructure/alumni/alumni.service';
import { StudentSearchDropdownComponent } from '../../../shared/ui/student-search-dropdown/student-search-dropdown.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
    selector: 'app-alumni-list',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePipe, StudentSearchDropdownComponent],
    templateUrl: './alumni-list.component.html',
    styleUrl: './alumni-list.component.css'
})
export class AlumniListComponent implements OnInit {
    private alumniService = inject(AlumniService);
    private toast = inject(ToastService);

    alumni = signal<any[]>([]);
    isLoading = signal<boolean>(true);

    // Filters
    searchQuery = signal<string>('');
    yearFilter = signal<string>('ALL');
    careerFilter = signal<string>('ALL');
    viewMode = signal<'GRID' | 'TABLE'>('GRID');

    // Legacy Detail Modal
    selectedLegacy = signal<AlumniLegacy | null>(null);
    isLegacyModalOpen = signal<boolean>(false);
    isLegacyLoading = signal<boolean>(false);

    // Graduate Student Induction Modal
    isGraduateModalOpen = signal<boolean>(false);
    isGraduating = signal<boolean>(false);
    newGraduate = signal<{
        student_id: string;
        higher_ed: string;
        current_career: string;
        linkedin_url: string;
    }>({
        student_id: '',
        higher_ed: '',
        current_career: '',
        linkedin_url: ''
    });

    // Computed Stats
    totalAlumniCount = computed(() => this.alumni().length);
    
    higherEdCount = computed(() => {
        return this.alumni().filter(a => !!a.alumni_profile?.higher_ed).length;
    });

    careerCount = computed(() => {
        return this.alumni().filter(a => !!a.alumni_profile?.current_career).length;
    });

    availableYears = computed(() => {
        const years = new Set<string>();
        this.alumni().forEach(a => {
            if (a.graduation_date) {
                const yr = new Date(a.graduation_date).getFullYear().toString();
                if (yr && yr !== 'NaN') years.add(yr);
            }
        });
        return Array.from(years).sort().reverse();
    });

    // Filtered Alumni List
    filteredAlumni = computed(() => {
        let list = this.alumni();
        const query = this.searchQuery().toLowerCase().trim();
        const yr = this.yearFilter();
        const career = this.careerFilter();

        if (yr !== 'ALL') {
            list = list.filter(a => {
                if (!a.graduation_date) return false;
                return new Date(a.graduation_date).getFullYear().toString() === yr;
            });
        }

        if (career !== 'ALL') {
            if (career === 'HIGHER_ED') {
                list = list.filter(a => !!a.alumni_profile?.higher_ed);
            } else if (career === 'CAREER') {
                list = list.filter(a => !!a.alumni_profile?.current_career);
            }
        }

        if (query) {
            list = list.filter(a => {
                const fullName = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
                const email = (a.email || '').toLowerCase();
                const enrollment = (a.enrollment_num || '').toLowerCase();
                const higherEd = (a.alumni_profile?.higher_ed || '').toLowerCase();
                const careerStr = (a.alumni_profile?.current_career || '').toLowerCase();
                return fullName.includes(query) || email.includes(query) || enrollment.includes(query) || higherEd.includes(query) || careerStr.includes(query);
            });
        }

        return list;
    });

    ngOnInit() {
        this.loadAlumni();
    }

    loadAlumni() {
        this.isLoading.set(true);
        this.alumniService.getAlumni().subscribe({
            next: (data) => {
                this.alumni.set(data || []);
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
                this.toast.error('Failed to load alumni directory records.', 'Network Error');
            }
        });
    }

    viewLegacy(id: string) {
        if (!id) return;
        this.isLegacyLoading.set(true);
        this.isLegacyModalOpen.set(true);

        this.alumniService.getAlumniLegacy(id).subscribe({
            next: (legacy) => {
                this.selectedLegacy.set(legacy);
                this.isLegacyLoading.set(false);
            },
            error: () => {
                // Fallback from local data if legacy endpoint has partial info
                const local = this.alumni().find(a => a.id === id);
                if (local) {
                    this.selectedLegacy.set({
                        student: local,
                        profile: local.alumni_profile || {
                            id: local.id,
                            student_id: local.id,
                            higher_ed: '',
                            current_career: '',
                            linkedin_url: '',
                            updated_at: new Date().toISOString()
                        }
                    });
                }
                this.isLegacyLoading.set(false);
            }
        });
    }

    closeLegacyModal() {
        this.isLegacyModalOpen.set(false);
        this.selectedLegacy.set(null);
    }

    openGraduateModal() {
        this.newGraduate.set({
            student_id: '',
            higher_ed: '',
            current_career: '',
            linkedin_url: ''
        });
        this.isGraduateModalOpen.set(true);
    }

    closeGraduateModal() {
        this.isGraduateModalOpen.set(false);
    }

    submitGraduate() {
        const form = this.newGraduate();
        if (!form.student_id) {
            this.toast.warning('Please select an enrolled scholar to graduate.', 'Student Required');
            return;
        }

        this.isGraduating.set(true);
        this.alumniService.graduateStudent(form.student_id, {
            higher_ed: form.higher_ed.trim(),
            current_career: form.current_career.trim(),
            linkedin_url: form.linkedin_url.trim()
        }).subscribe({
            next: () => {
                this.isGraduating.set(false);
                this.toast.success('Scholar inducted into Alumni Network!', 'Graduation Complete');
                this.closeGraduateModal();
                this.loadAlumni();
            },
            error: (err) => {
                this.isGraduating.set(false);
                const msg = err.error?.error || 'Failed to process student graduation.';
                this.toast.error(msg, 'Induction Failed');
            }
        });
    }

    exportAlumniCSV() {
        const rows = this.filteredAlumni();
        if (rows.length === 0) {
            this.toast.warning('No alumni records to export.', 'Export Empty');
            return;
        }

        const headers = ['Full Name', 'Graduation Year', 'Enrollment ID', 'Email', 'Higher Education', 'Current Career', 'LinkedIn'];
        const csvContent = [
            headers.join(','),
            ...rows.map(a => [
                `"${a.first_name || ''} ${a.last_name || ''}"`,
                `"${a.graduation_date ? new Date(a.graduation_date).getFullYear() : 'N/A'}"`,
                `"${a.enrollment_num || a.id || ''}"`,
                `"${a.email || ''}"`,
                `"${(a.alumni_profile?.higher_ed || '').replace(/"/g, '""')}"`,
                `"${(a.alumni_profile?.current_career || '').replace(/"/g, '""')}"`,
                `"${(a.alumni_profile?.linkedin_url || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `schoollinx_alumni_directory_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        this.toast.success(`Exported ${rows.length} alumni records to CSV`, 'Export Complete');
    }
}
