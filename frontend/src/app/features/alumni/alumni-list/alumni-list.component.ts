import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlumniService } from '../../../core/infrastructure/alumni/alumni.service';

@Component({
    selector: 'app-alumni-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './alumni-list.component.html',
    styleUrl: './alumni-list.component.css'
})
export class AlumniListComponent implements OnInit {
    private alumniService = inject(AlumniService);

    alumni = signal<any[]>([]);
    searchQuery = signal('');

    filteredAlumni = computed(() => {
        const query = this.searchQuery().toLowerCase();
        if (!query) return this.alumni();
        return this.alumni().filter(a =>
            `${a.first_name} ${a.last_name}`.toLowerCase().includes(query) ||
            a.email.toLowerCase().includes(query)
        );
    });

    ngOnInit() {
        this.alumniService.getAlumni().subscribe(data => {
            this.alumni.set(data);
        });
    }

    viewLegacy(id: string) {
        console.log('Viewing alumni legacy for:', id);
        // Future: Open detail modal or navigate to legacy profile
    }
}
