import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Newsletter {
    id: string;
    title: string;
    content?: string;
    status: string;
    sent_at?: string;
    sent_count?: number;
    audience?: string;
    created_at: string;
}

@Component({
    selector: 'app-newsletter',
    standalone: true,
    imports: [CommonModule, DatePipe, FormsModule, RouterLink],
    templateUrl: './newsletter.component.html',
    styleUrl: './newsletter.component.css'
})
export class NewsletterComponent implements OnInit {
    private http = inject(HttpClient);

    newsletters = signal<Newsletter[]>([]);
    isLoading = signal(true);
    isGenerating = signal(false);
    sendingId = signal<string | null>(null);
    showBuilder = signal(false);
    selectedNewsletterForPreview = signal<Newsletter | null>(null);

    // Filter & Search
    searchQuery = signal('');
    statusFilter = signal<'ALL' | 'SENT' | 'DRAFT'>('ALL');
    selectedAudience = signal('ALL');

    newTitle = signal('');
    newContent = signal('');

    sentCount = computed(() => this.newsletters().filter(n => n.status === 'SENT').length);
    draftCount = computed(() => this.newsletters().filter(n => n.status === 'DRAFT').length);
    totalRecipients = computed(() => this.newsletters().reduce((acc, n) => acc + (n.sent_count || 0), 0));

    filteredNewsletters = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const status = this.statusFilter();
        
        return this.newsletters().filter(n => {
            const matchesQuery = !query || 
                n.title?.toLowerCase().includes(query) ||
                n.audience?.toLowerCase().includes(query);

            if (!matchesQuery) return false;

            if (status === 'SENT' && n.status !== 'SENT') return false;
            if (status === 'DRAFT' && n.status !== 'DRAFT') return false;

            return true;
        });
    });

    ngOnInit() {
        this.loadNewsletters();
    }

    loadNewsletters() {
        this.isLoading.set(true);
        this.http.get<Newsletter[]>('/api/newsletter/').subscribe({
            next: (data) => {
                this.newsletters.set(data || []);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    generateWeekly() {
        this.isGenerating.set(true);
        this.http.post<Newsletter>('/api/newsletter/generate', {}).subscribe({
            next: (n) => {
                this.newsletters.update(list => [n, ...list]);
                this.isGenerating.set(false);
            },
            error: () => this.isGenerating.set(false)
        });
    }

    createCustom() {
        const title = this.newTitle().trim();
        const content = this.newContent().trim();
        const audience = this.selectedAudience();
        if (!title || !content) return;

        this.isGenerating.set(true);
        this.http.post<Newsletter>('/api/newsletter/custom', { title, content, audience }).subscribe({
            next: (n) => {
                this.newsletters.update(list => [n, ...list]);
                this.isGenerating.set(false);
                this.showBuilder.set(false);
                this.newTitle.set('');
                this.newContent.set('');
            },
            error: () => this.isGenerating.set(false)
        });
    }

    setStatusFilter(status: 'ALL' | 'SENT' | 'DRAFT') {
        this.statusFilter.set(status);
    }

    openPreview(newsletter: Newsletter) {
        this.selectedNewsletterForPreview.set(newsletter);
    }

    closePreview() {
        this.selectedNewsletterForPreview.set(null);
    }

    execCommand(command: string) {
        document.execCommand(command, false, '');
    }

    sendNewsletter(id: string) {
        this.sendingId.set(id);
        this.http.post(`/api/newsletter/${id}/send`, {}).subscribe({
            next: () => {
                this.newsletters.update(list =>
                    list.map(n => n.id === id ? { ...n, status: 'SENT', sent_at: new Date().toISOString() } : n)
                );
                this.sendingId.set(null);
            },
            error: () => this.sendingId.set(null)
        });
    }

    getStatusClasses(status: string): string {
        switch (status) {
            case 'SENT': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'FAILED': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
    }
}
