import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ReportService, TranscriptVerificationResult } from '../../../core/infrastructure/report/report.service';

@Component({
    selector: 'app-transcript-verify',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './transcript-verify.component.html',
    styleUrls: ['./transcript-verify.component.css']
})
export class TranscriptVerifyComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private reportService = inject(ReportService);

    hash = signal<string>('');
    isLoading = signal<boolean>(true);
    verification = signal<TranscriptVerificationResult | null>(null);
    errorMessage = signal<string>('');

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const h = params.get('hash');
            if (h) {
                this.hash.set(h);
                this.verify(h);
            } else {
                this.isLoading.set(false);
                this.errorMessage.set('No cryptographic verification hash provided.');
            }
        });
    }

    private verify(hash: string) {
        this.isLoading.set(true);
        this.errorMessage.set('');

        this.reportService.verifyTranscript(hash).subscribe({
            next: (result) => {
                this.verification.set(result);
                this.isLoading.set(false);
            },
            error: () => {
                // Friendly error message as instructed
                this.errorMessage.set('Verification record not found. The document may be invalid or pending authentication.');
                this.isLoading.set(false);
            }
        });
    }

    copyHash() {
        if (this.hash()) {
            navigator.clipboard.writeText(this.hash());
        }
    }
}
