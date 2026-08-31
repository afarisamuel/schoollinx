import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExtracurricularService, Club, ClubEvent, ClubCategory } from '../../../core/infrastructure/extracurricular/extracurricular.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
    selector: 'app-club-discovery',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './club-discovery.component.html',
    styleUrl: './club-discovery.component.css'
})
export class ClubDiscoveryComponent implements OnInit {
    private extraService = inject(ExtracurricularService);
    private dialog = inject(DialogService);

    clubs = signal<Club[]>([]);
    joinedClubIds = signal<Set<string>>(new Set());
    events = signal<ClubEvent[]>([]);
    activeCategory = signal<ClubCategory | null>(null);
    searchTerm = signal('');

    filteredClubs = computed(() => {
        let list = this.clubs();
        const categorySelection = this.activeCategory();
        const searchVal = this.searchTerm().toLowerCase().trim();

        if (categorySelection) {
            list = list.filter((c: Club) => c.category === categorySelection);
        }

        if (searchVal) {
            list = list.filter((c: Club) => 
                c.name.toLowerCase().includes(searchVal) || 
                c.description.toLowerCase().includes(searchVal)
            );
        }

        const currentlyJoined = this.joinedClubIds();
        return list.map((c: Club) => ({
            ...c,
            isJoined: currentlyJoined.has(c.id)
        }));
    });

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        forkJoin({
            allClubs: this.extraService.getClubs().pipe(catchError(() => of([]))),
            myClubs: this.extraService.getMyClubs().pipe(catchError(() => of([]))),
            events: this.extraService.getEvents().pipe(catchError(() => of([])))
        }).subscribe({
            next: ({ allClubs, myClubs, events }: { allClubs: Club[], myClubs: Club[], events: ClubEvent[] }) => {
                this.clubs.set(allClubs || []);
                this.joinedClubIds.set(new Set<string>((myClubs || []).map((c: Club) => c.id)));
                this.events.set(events || []);
            },
            error: (err) => {
                console.error('Failed to load club data', err);
            }
        });
    }

    toggleJoin(club: Club) {
        const isJoined = this.joinedClubIds().has(club.id);
        
        if (isJoined) {
            this.dialog.confirm(`Are you sure you want to leave ${club.name}?`, 'Leave Club', 'danger', 'Leave').subscribe((confirmed: boolean) => {
                if (confirmed) {
                    this.extraService.leaveClub(club.id).subscribe(() => {
                        this.joinedClubIds.update((set: Set<string>) => {
                            const newSet = new Set<string>(set);
                            newSet.delete(club.id);
                            return newSet;
                        });
                    });
                }
            });
        } else {
            this.extraService.joinClub(club.id).subscribe(() => {
                this.joinedClubIds.update((set: Set<string>) => {
                    const newSet = new Set<string>(set);
                    newSet.add(club.id);
                    return newSet;
                });
            });
        }
    }
}
