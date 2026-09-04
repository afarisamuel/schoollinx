import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExtracurricularService, Club, ClubEvent, ClubCategory } from '../../../core/infrastructure/extracurricular/extracurricular.service';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
    selector: 'app-club-discovery',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePipe],
    templateUrl: './club-discovery.component.html',
    styleUrl: './club-discovery.component.css'
})
export class ClubDiscoveryComponent implements OnInit {
    private extraService = inject(ExtracurricularService);
    private teacherService = inject(TeacherService);
    private toast = inject(ToastService);
    private dialog = inject(DialogService);

    clubs = signal<Club[]>([]);
    teachers = signal<any[]>([]);
    joinedClubIds = signal<Set<string>>(new Set());
    events = signal<ClubEvent[]>([]);
    activeCategory = signal<ClubCategory | null>(null);
    activeViewTab = signal<'ALL' | 'MY_CLUBS'>('ALL');
    searchTerm = signal('');
    isLoading = signal<boolean>(true);

    // Create Club Modal State
    isCreateModalOpen = signal<boolean>(false);
    isCreating = signal<boolean>(false);
    newClub = signal<{
        name: string;
        description: string;
        category: ClubCategory;
        teacher_id: string;
    }>({
        name: '',
        description: '',
        category: 'ACADEMIC',
        teacher_id: ''
    });

    // Schedule Event Modal State
    isScheduleModalOpen = signal<boolean>(false);
    isScheduling = signal<boolean>(false);
    newEvent = signal<{
        title: string;
        description: string;
        location: string;
        start_time: string;
        end_time: string;
        club_id: string;
    }>({
        title: '',
        description: '',
        location: '',
        start_time: '',
        end_time: '',
        club_id: ''
    });

    // Computed Stats
    totalCommunitiesCount = computed(() => this.clubs().length);
    joinedCommunitiesCount = computed(() => this.joinedClubIds().size);
    totalEventsCount = computed(() => this.events().length);

    // Filtered Clubs
    filteredClubs = computed(() => {
        let list = this.clubs();
        const categorySelection = this.activeCategory();
        const searchVal = this.searchTerm().toLowerCase().trim();
        const tab = this.activeViewTab();
        const currentlyJoined = this.joinedClubIds();

        if (tab === 'MY_CLUBS') {
            list = list.filter((c: Club) => currentlyJoined.has(c.id));
        }

        if (categorySelection) {
            list = list.filter((c: Club) => c.category === categorySelection);
        }

        if (searchVal) {
            list = list.filter((c: Club) => 
                c.name.toLowerCase().includes(searchVal) || 
                (c.description || '').toLowerCase().includes(searchVal) ||
                (c.category || '').toLowerCase().includes(searchVal)
            );
        }

        return list.map((c: Club) => ({
            ...c,
            isJoined: currentlyJoined.has(c.id)
        }));
    });

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.isLoading.set(true);
        forkJoin({
            allClubs: this.extraService.getClubs().pipe(catchError(() => of([]))),
            myClubs: this.extraService.getMyClubs().pipe(catchError(() => of([]))),
            events: this.extraService.getEvents().pipe(catchError(() => of([]))),
            teachers: this.teacherService.getTeachers().pipe(catchError(() => of([])))
        }).subscribe({
            next: ({ allClubs, myClubs, events, teachers }) => {
                this.clubs.set(allClubs || []);
                this.joinedClubIds.set(new Set<string>((myClubs || []).map((c: Club) => c.id)));
                this.events.set(events || []);
                this.teachers.set(teachers || []);
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
                this.toast.error('Failed to load student communities.', 'Sync Error');
            }
        });
    }

    // Modal Triggers
    openCreateModal() {
        this.newClub.set({
            name: '',
            description: '',
            category: 'ACADEMIC',
            teacher_id: this.teachers()[0]?.id || ''
        });
        this.isCreateModalOpen.set(true);
    }

    closeCreateModal() {
        this.isCreateModalOpen.set(false);
    }

    createClubSubmit() {
        const form = this.newClub();
        if (!form.name.trim()) {
            this.toast.warning('Please enter a community or club name.', 'Name Required');
            return;
        }

        this.isCreating.set(true);
        this.extraService.createClub({
            name: form.name.trim(),
            description: form.description.trim(),
            category: form.category,
            teacher_id: form.teacher_id || undefined
        }).subscribe({
            next: (created) => {
                this.isCreating.set(false);
                this.toast.success(`Successfully founded "${form.name.trim()}"!`, 'Community Created');
                this.closeCreateModal();
                this.loadData();
            },
            error: (err) => {
                this.isCreating.set(false);
                const msg = err.error?.error || 'Failed to create community.';
                this.toast.error(msg, 'Creation Failed');
            }
        });
    }

    openScheduleModal(club?: Club) {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        this.newEvent.set({
            title: '',
            description: '',
            location: 'Main Auditorium',
            start_time: now.toISOString().slice(0, 16),
            end_time: oneHourLater.toISOString().slice(0, 16),
            club_id: club?.id || this.clubs()[0]?.id || ''
        });
        this.isScheduleModalOpen.set(true);
    }

    closeScheduleModal() {
        this.isScheduleModalOpen.set(false);
    }

    scheduleEventSubmit() {
        const form = this.newEvent();
        if (!form.title.trim()) {
            this.toast.warning('Please enter an event title.', 'Title Required');
            return;
        }
        if (!form.start_time || !form.end_time) {
            this.toast.warning('Please select valid start and end times.', 'Times Required');
            return;
        }

        this.isScheduling.set(true);
        this.extraService.scheduleEvent({
            title: form.title.trim(),
            description: form.description.trim(),
            location: form.location.trim(),
            start_time: new Date(form.start_time).toISOString(),
            end_time: new Date(form.end_time).toISOString(),
            club_id: form.club_id || undefined
        }).subscribe({
            next: () => {
                this.isScheduling.set(false);
                this.toast.success(`Scheduled "${form.title.trim()}" event!`, 'Event Published');
                this.closeScheduleModal();
                this.loadData();
            },
            error: (err) => {
                this.isScheduling.set(false);
                const msg = err.error?.error || 'Failed to schedule event.';
                this.toast.error(msg, 'Scheduling Failed');
            }
        });
    }

    toggleJoin(club: Club) {
        const isJoined = this.joinedClubIds().has(club.id);
        
        if (isJoined) {
            this.dialog.confirm(`Are you sure you want to leave ${club.name}?`, 'Leave Club', 'danger', 'Leave').subscribe((confirmed: boolean) => {
                if (confirmed) {
                    this.extraService.leaveClub(club.id).subscribe({
                        next: () => {
                            this.joinedClubIds.update((set: Set<string>) => {
                                const newSet = new Set<string>(set);
                                newSet.delete(club.id);
                                return newSet;
                            });
                            this.toast.info(`You have left ${club.name}.`, 'Membership Updated');
                        },
                        error: (err) => {
                            this.toast.error(err.error?.error || 'Failed to leave club.', 'Action Failed');
                        }
                    });
                }
            });
        } else {
            this.extraService.joinClub(club.id).subscribe({
                next: () => {
                    this.joinedClubIds.update((set: Set<string>) => {
                        const newSet = new Set<string>(set);
                        newSet.add(club.id);
                        return newSet;
                    });
                    this.toast.success(`Welcome to ${club.name}! You are now an active member.`, 'Joined Community');
                },
                error: (err) => {
                    this.toast.error(err.error?.error || 'Failed to join club.', 'Action Failed');
                }
            });
        }
    }

    getCategoryBadge(category: ClubCategory): { label: string; icon: string; bg: string; text: string; border: string } {
        switch (category) {
            case 'ACADEMIC':
                return { label: 'Academic & STEM', icon: 'fa-graduation-cap', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' };
            case 'SPORTS':
                return { label: 'Athletics & Sports', icon: 'fa-futbol', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' };
            case 'ARTS':
                return { label: 'Creative & Arts', icon: 'fa-palette', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' };
            case 'SOCIAL':
            default:
                return { label: 'Social & Leadership', icon: 'fa-people-roof', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' };
        }
    }

    getTeacherName(teacherId?: string): string {
        if (!teacherId) return 'Faculty Advisory Board';
        const t = this.teachers().find(x => x.id === teacherId);
        return t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : 'Staff Advisor';
    }
}
