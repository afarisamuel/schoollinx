import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HouseService, House } from '../../../core/infrastructure/house/house.service';

@Component({
    selector: 'app-house-leaderboard',
    standalone: true,
    imports: [CommonModule, DecimalPipe],
    templateUrl: './leaderboard.component.html',
    styleUrl: './leaderboard.component.css'
})
export class LeaderboardComponent implements OnInit {
    private houseService = inject(HouseService);

    houses = signal<House[]>([]);
    isLoading = signal(true);
    error = signal('');

    ngOnInit() {
        this.loadLeaderboard();
    }

    loadLeaderboard() {
        this.isLoading.set(true);
        this.houseService.getLeaderboard().subscribe({
            next: (data) => {
                this.houses.set(data);
                this.isLoading.set(false);
            },
            error: (err) => {
                this.error.set('Failed to load leaderboard');
                this.isLoading.set(false);
            }
        });
    }

    getPodiumHeight(rank: number): string {
        switch (rank) {
            case 1: return 'h-48 md:h-64';
            case 2: return 'h-36 md:h-48';
            case 3: return 'h-24 md:h-32';
            default: return 'h-16';
        }
    }

    getRankColor(rank: number): string {
        switch (rank) {
            case 1: return 'from-yellow-300 to-amber-500';
            case 2: return 'from-slate-300 to-slate-400';
            case 3: return 'from-amber-600 to-amber-800';
            default: return 'from-gray-500 to-gray-600';
        }
    }
}
