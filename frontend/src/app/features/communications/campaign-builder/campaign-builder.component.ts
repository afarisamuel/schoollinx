import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampaignService, Campaign } from '../../../core/infrastructure/communications/campaign.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-campaign-builder',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './campaign-builder.component.html',
    styleUrl: './campaign-builder.component.css'
})
export class CampaignBuilderComponent {
    private campaignService = inject(CampaignService);
    private dialog = inject(DialogService);

    campaigns = signal<Campaign[]>([]);
    isLoading = signal(false);
    successMsg = signal('');
    errorMsg = signal('');

    draft: Partial<Campaign> = {
        subject: '',
        body_html: '',
        target: 'ALL_PARENTS'
    };

    targetOptions = [
        { value: 'ALL_PARENTS', label: '👨‍👩‍👧 All Parents / Guardians' },
        { value: 'ALL_STUDENTS', label: '🎓 All Students' },
        { value: 'ALL_USERS', label: '🌐 All Platform Users' },
    ];

    ngOnInit() {
        this.loadCampaigns();
    }

    loadCampaigns() {
        this.campaignService.getAll().subscribe(data => this.campaigns.set(data));
    }

    saveDraft() {
        if (!this.draft.subject || !this.draft.body_html) {
            this.errorMsg.set('Subject and body are required.');
            return;
        }
        this.isLoading.set(true);
        this.campaignService.create(this.draft as Campaign).subscribe({
            next: () => {
                this.successMsg.set('Draft saved successfully!');
                this.draft = { subject: '', body_html: '', target: 'ALL_PARENTS' };
                this.loadCampaigns();
                this.isLoading.set(false);
            },
            error: (e) => { this.errorMsg.set(e.message); this.isLoading.set(false); }
        });
    }

    dispatch(campaign: Campaign) {
        if (!campaign.id) return;
        this.dialog.confirm(`Dispatch "${campaign.subject}" to ${campaign.target}?`, 'Dispatch Campaign', 'warning', 'Dispatch').subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.campaignService.dispatch(campaign.id!).subscribe({
                    next: () => {
                        this.successMsg.set('Campaign is being dispatched in the background!');
                        this.loadCampaigns();
                    },
                    error: (e) => this.errorMsg.set(e.error?.error || 'Dispatch failed.')
                });
            }
        });
    }

    deleteCampaign(id: string) {
        this.dialog.confirm('Delete this campaign?', 'Delete Campaign', 'danger', 'Delete').subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.campaignService.delete(id).subscribe(() => this.loadCampaigns());
            }
        });
    }
}
