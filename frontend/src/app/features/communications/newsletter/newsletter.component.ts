import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Newsletter {
    id: string;
    title: string;
    status: string;
    sent_at: string;
    sent_count: number;
    audience: string;
    created_at: string;
}

@Component({
    selector: 'app-newsletter',
    standalone: true,
    imports: [CommonModule, DatePipe],
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
    newTitle = signal('');
    newContent = signal('');

    sentCount = computed(() => this.newsletters().filter(n => n.status === 'SENT').length);
    draftCount = computed(() => this.newsletters().filter(n => n.status === 'DRAFT').length);

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
        if (!title || !content) return;

        this.isGenerating.set(true);
        this.http.post<Newsletter>('/api/newsletter/custom', { title, content, audience: 'ALL' }).subscribe({
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

    execCommand(command: string) {
        document.execCommand(command, false, '');
    }

    sendNewsletter(id: string) {
        this.sendingId.set(id);
        this.http.post(`/api/newsletter/${id}/send`, {}).subscribe({
            next: () => {
                this.newsletters.update(list =>
                    list.map(n => n.id === id ? { ...n, status: 'SENT' } : n)
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
