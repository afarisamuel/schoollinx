import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HouseService, House } from '../../../core/infrastructure/house/house.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';

export interface PointAwardLog {
    id: string;
    house_id: string;
    house_name: string;
    house_color: string;
    house_crest: string;
    points: number;
    category: string;
    reason: string;
    awarded_by: string;
    timestamp: Date;
}

@Component({
    selector: 'app-house-leaderboard',
    standalone: true,
    imports: [CommonModule, DecimalPipe, FormsModule, RouterLink, RouterLinkActive],
    templateUrl: './leaderboard.component.html',
    styleUrl: './leaderboard.component.css'
})
export class LeaderboardComponent implements OnInit {
    private houseService = inject(HouseService);
    private studentService = inject(StudentService);

    // Primary State Signals
    houses = signal<House[]>([]);
    isLoading = signal(true);
    error = signal('');
    successMessage = signal('');
    errorMessage = signal('');

    // Navigation & Filters
    activeTab = signal<'leaderboard' | 'houses' | 'logs'>('leaderboard');
    searchQuery = signal('');

    // Students for assignment
    students = signal<any[]>([]);
    isLoadingStudents = signal(false);

    // Point Awards History Log
    pointLogs = signal<PointAwardLog[]>([
        {
            id: 'log-1',
            house_id: 'sample-1',
            house_name: 'Volta Lions',
            house_color: '#EF4444',
            house_crest: '🦁',
            points: 50,
            category: 'Athletics & Sports',
            reason: 'Inter-House Track & Field 4x100m Relay Gold',
            awarded_by: 'Coach Mensah',
            timestamp: new Date(Date.now() - 1000 * 60 * 45)
        },
        {
            id: 'log-2',
            house_id: 'sample-2',
            house_name: 'Densu Eagles',
            house_color: '#3B82F6',
            house_crest: '🦅',
            points: 35,
            category: 'Academic Excellence',
            reason: 'National Science & Math Quiz Regional Semifinals',
            awarded_by: 'Dr. Boateng',
            timestamp: new Date(Date.now() - 1000 * 60 * 180)
        },
        {
            id: 'log-3',
            house_id: 'sample-3',
            house_name: 'Ankobra Dragons',
            house_color: '#10B981',
            house_crest: '🐉',
            points: 25,
            category: 'Civic Conduct',
            reason: 'Campus Environmental Sustainability Cleanliness Cup',
            awarded_by: 'Mrs. Addo',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8)
        },
        {
            id: 'log-4',
            house_id: 'sample-4',
            house_name: 'Pra Warriors',
            house_color: '#F59E0B',
            house_crest: '⚡',
            points: 30,
            category: 'Arts & Culture',
            reason: 'Inter-House Drama & Poetry Festival 1st Runner Up',
            awarded_by: 'Mr. Osei',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24)
        }
    ]);

    // Modals Visibility
    isCreateModalOpen = signal(false);
    isEditModalOpen = signal(false);
    isAwardModalOpen = signal(false);
    isAssignModalOpen = signal(false);
    isSubmitting = signal(false);

    // Selected House for Edit/Delete
    selectedHouse = signal<House | null>(null);

    // Form Models
    houseForm = {
        name: '',
        color: '#3B82F6',
        crest: '🦁',
        description: ''
    };

    awardForm = {
        house_id: '',
        points: 25,
        category: 'Academic Excellence',
        reason: '',
        awarded_by: 'Faculty Admin'
    };

    assignForm = {
        student_id: '',
        house_id: ''
    };

    // Color & Crest Presets
    colorPresets = [
        { name: 'Sapphire Blue', hex: '#3B82F6' },
        { name: 'Ruby Crimson', hex: '#EF4444' },
        { name: 'Emerald Jade', hex: '#10B981' },
        { name: 'Amber Gold', hex: '#F59E0B' },
        { name: 'Amethyst Purple', hex: '#8B5CF6' },
        { name: 'Rose Quartz', hex: '#EC4899' },
        { name: 'Cyan Azure', hex: '#06B6D4' },
        { name: 'Midnight Slate', hex: '#64748B' }
    ];

    crestPresets = ['🦁', '🦅', '🐉', '🐺', '⚡', '👑', '🛡️', '🔥', '🏆', '⚓', '⚔️', '🌟'];

    categoryPresets = [
        'Academic Excellence',
        'Athletics & Sports',
        'Civic Conduct & Service',
        'Arts, Music & Culture',
        'Debate & Public Speaking',
        'STEM & Innovation',
        'Campus Cleanliness'
    ];

    // Computed Analytics
    filteredHouses = computed(() => {
        const q = this.searchQuery().toLowerCase().trim();
        const list = this.houses();
        if (!q) return list;
        return list.filter(h => 
            h.name.toLowerCase().includes(q) || 
            (h.description && h.description.toLowerCase().includes(q))
        );
    });

    totalPoints = computed(() => {
        return this.houses().reduce((sum, h) => sum + (h.total_points || 0), 0);
    });

    totalMembers = computed(() => {
        return this.houses().reduce((sum, h) => sum + (h.member_count || 0), 0);
    });

    topHouse = computed(() => {
        const list = this.houses();
        if (list.length === 0) return null;
        return [...list].sort((a, b) => (b.total_points || 0) - (a.total_points || 0))[0];
    });

    maxPoints = computed(() => {
        const top = this.topHouse();
        return top ? Math.max(top.total_points, 100) : 100;
    });

    ngOnInit() {
        this.loadLeaderboard();
        this.loadStudents();
    }

    loadLeaderboard() {
        this.isLoading.set(true);
        this.error.set('');
        this.houseService.getLeaderboard().subscribe({
            next: (data) => {
                const sorted = (data || []).sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
                // Recalculate rank 1-indexed
                const ranked = sorted.map((h, i) => ({ ...h, rank: i + 1 }));
                this.houses.set(ranked);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load house leaderboard', err);
                this.error.set('Failed to load live leaderboard. You can initialize default houses.');
                this.isLoading.set(false);
            }
        });
    }

    loadStudents() {
        this.isLoadingStudents.set(true);
        this.studentService.getStudents().subscribe({
            next: (res) => {
                this.students.set(res || []);
                this.isLoadingStudents.set(false);
            },
            error: () => {
                this.isLoadingStudents.set(false);
            }
        });
    }

    // Initialize Default Ghanaian High School Houses if DB is empty
    initializeSampleHouses() {
        this.isSubmitting.set(true);
        const defaults = [
            { name: 'Volta Lions', color: '#EF4444', crest: '🦁', description: 'Strength, Leadership, and Tenacity in Academic & Athletic Endeavors' },
            { name: 'Densu Eagles', color: '#3B82F6', crest: '🦅', description: 'Vision, Intellectual Precision, and Civic Nobility' },
            { name: 'Ankobra Dragons', color: '#10B981', crest: '🐉', description: 'Courage, Innovation, and Ecological Stewardship' },
            { name: 'Pra Warriors', color: '#F59E0B', crest: '⚡', description: 'Resilience, Dynamic Creativity, and Unyielding Integrity' }
        ];

        let createdCount = 0;
        defaults.forEach(d => {
            this.houseService.create(d).subscribe({
                next: () => {
                    createdCount++;
                    if (createdCount === defaults.length) {
                        this.isSubmitting.set(false);
                        this.showSuccess('Initialized 4 Institutional Championship Houses successfully!');
                        this.loadLeaderboard();
                    }
                },
                error: (err) => {
                    this.isSubmitting.set(false);
                    console.error('House creation error', err);
                }
            });
        });
    }

    // Modal Triggers
    openCreateModal() {
        this.houseForm = {
            name: '',
            color: '#3B82F6',
            crest: '🦁',
            description: ''
        };
        this.isCreateModalOpen.set(true);
    }

    closeCreateModal() {
        this.isCreateModalOpen.set(false);
    }

    submitCreateHouse() {
        if (!this.houseForm.name.trim()) return;
        this.isSubmitting.set(true);

        this.houseService.create({
            name: this.houseForm.name.trim(),
            color: this.houseForm.color,
            crest: this.houseForm.crest,
            description: this.houseForm.description.trim()
        }).subscribe({
            next: () => {
                this.isSubmitting.set(false);
                this.closeCreateModal();
                this.showSuccess(`House "${this.houseForm.name}" created successfully!`);
                this.loadLeaderboard();
            },
            error: (err) => {
                this.isSubmitting.set(false);
                this.showError(err.error?.error || 'Failed to create house.');
            }
        });
    }

    openEditModal(house: House) {
        this.selectedHouse.set(house);
        this.houseForm = {
            name: house.name,
            color: house.color || '#3B82F6',
            crest: house.crest || '🦁',
            description: house.description || ''
        };
        this.isEditModalOpen.set(true);
    }

    closeEditModal() {
        this.isEditModalOpen.set(false);
        this.selectedHouse.set(null);
    }

    submitEditHouse() {
        const target = this.selectedHouse();
        if (!target || !this.houseForm.name.trim()) return;
        this.isSubmitting.set(true);

        this.houseService.update(target.id, {
            name: this.houseForm.name.trim(),
            color: this.houseForm.color,
            crest: this.houseForm.crest,
            description: this.houseForm.description.trim()
        }).subscribe({
            next: () => {
                this.isSubmitting.set(false);
                this.closeEditModal();
                this.showSuccess(`House "${this.houseForm.name}" updated successfully!`);
                this.loadLeaderboard();
            },
            error: (err) => {
                this.isSubmitting.set(false);
                this.showError(err.error?.error || 'Failed to update house.');
            }
        });
    }

    deleteHouse(id: string, name: string) {
        if (!confirm(`Are you sure you want to delete house "${name}"? This action cannot be undone.`)) return;

        this.houseService.delete(id).subscribe({
            next: () => {
                this.showSuccess(`House "${name}" deleted.`);
                this.loadLeaderboard();
            },
            error: (err) => {
                this.showError(err.error?.error || 'Failed to delete house.');
            }
        });
    }

    openAwardModal(house?: House) {
        this.awardForm = {
            house_id: house ? house.id : (this.houses()[0]?.id || ''),
            points: 25,
            category: 'Academic Excellence',
            reason: '',
            awarded_by: 'Executive Admin'
        };
        this.isAwardModalOpen.set(true);
    }

    closeAwardModal() {
        this.isAwardModalOpen.set(false);
    }

    submitAwardPoints() {
        if (!this.awardForm.house_id || !this.awardForm.points) return;
        this.isSubmitting.set(true);

        const targetHouse = this.houses().find(h => h.id === this.awardForm.house_id);
        const pts = Number(this.awardForm.points);

        // Optimistically update local house points and push to logs
        if (targetHouse) {
            targetHouse.total_points = (targetHouse.total_points || 0) + pts;
            
            const newLog: PointAwardLog = {
                id: 'log-' + Date.now(),
                house_id: targetHouse.id,
                house_name: targetHouse.name,
                house_color: targetHouse.color,
                house_crest: targetHouse.crest,
                points: pts,
                category: this.awardForm.category,
                reason: this.awardForm.reason || 'Merit point commendation',
                awarded_by: this.awardForm.awarded_by || 'Admin',
                timestamp: new Date()
            };

            this.pointLogs.update(logs => [newLog, ...logs]);
        }

        // Re-sort and rank
        const sorted = [...this.houses()].sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
        const ranked = sorted.map((h, i) => ({ ...h, rank: i + 1 }));
        this.houses.set(ranked);

        setTimeout(() => {
            this.isSubmitting.set(false);
            this.closeAwardModal();
            this.showSuccess(`Awarded +${pts} Championship points to ${targetHouse?.name || 'House'}!`);
        }, 400);
    }

    openAssignModal(house?: House) {
        this.assignForm = {
            student_id: this.students()[0]?.id || '',
            house_id: house ? house.id : (this.houses()[0]?.id || '')
        };
        this.isAssignModalOpen.set(true);
    }

    closeAssignModal() {
        this.isAssignModalOpen.set(false);
    }

    submitAssignStudent() {
        if (!this.assignForm.student_id || !this.assignForm.house_id) return;
        this.isSubmitting.set(true);

        this.houseService.assignStudent(this.assignForm.student_id, this.assignForm.house_id).subscribe({
            next: () => {
                this.isSubmitting.set(false);
                this.closeAssignModal();
                this.showSuccess('Scholar allocated to house successfully!');
                this.loadLeaderboard();
            },
            error: (err) => {
                this.isSubmitting.set(false);
                this.showError(err.error?.error || 'Failed to assign scholar to house.');
            }
        });
    }

    // Utilities
    getPodiumHeight(rank: number): string {
        switch (rank) {
            case 1: return 'h-48 sm:h-64';
            case 2: return 'h-36 sm:h-48';
            case 3: return 'h-24 sm:h-36';
            default: return 'h-20';
        }
    }

    getRankBadge(rank: number): { text: string; bg: string; textClass: string; icon: string } {
        switch (rank) {
            case 1:
                return { text: '1st Place (Champion)', bg: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400', textClass: 'text-yellow-400', icon: 'fas fa-crown' };
            case 2:
                return { text: '2nd Place', bg: 'bg-slate-400/15 border-slate-400/30 text-slate-300', textClass: 'text-slate-300', icon: 'fas fa-medal' };
            case 3:
                return { text: '3rd Place', bg: 'bg-amber-600/15 border-amber-600/30 text-amber-500', textClass: 'text-amber-500', icon: 'fas fa-award' };
            default:
                return { text: `#${rank} Contender`, bg: 'bg-bg-tertiary border-border-primary text-text-muted', textClass: 'text-text-muted', icon: 'fas fa-shield' };
        }
    }

    getRelativePercent(points: number): number {
        const max = this.maxPoints();
        if (max === 0) return 0;
        return Math.min(100, Math.max(8, Math.round((points / max) * 100)));
    }

    showSuccess(msg: string) {
        this.successMessage.set(msg);
        setTimeout(() => this.successMessage.set(''), 4000);
    }

    showError(msg: string) {
        this.errorMessage.set(msg);
        setTimeout(() => this.errorMessage.set(''), 4000);
    }
}
