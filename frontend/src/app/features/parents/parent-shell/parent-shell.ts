import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { PaymentService } from '../../../core/infrastructure/payment/payment.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
    selector: 'app-parent-shell',
    standalone: true,
    imports: [CommonModule, RouterOutlet],
    templateUrl: './parent-shell.html'
})
export class ParentShell implements OnInit {
    state = inject(ParentStateService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private paymentService = inject(PaymentService);
    private toast = inject(ToastService);

    ngOnInit() {
        this.state.bootstrap();
        this.checkPaymentReturn();
    }

    private checkPaymentReturn() {
        this.route.queryParams.subscribe(params => {
            const ref = params['reference'] || params['trxref'];
            if (ref) {
                this.toast.info('Verifying transaction with Paystack...', 'Payment Verification');
                this.paymentService.verifyPayment(ref).subscribe({
                    next: () => {
                        this.toast.success('Payment verified successfully! Your student wallet and fee ledger have been updated.', 'Payment Successful');
                        this.state.reloadLedger();
                        const students = this.state.profile()?.students || [];
                        students.forEach(s => {
                            if (s.id) {
                                this.state.reloadWallet(s.id);
                                this.state.loadStudentData(s.id, s.class_id || '');
                            }
                        });
                        this.router.navigate([], { queryParams: {}, replaceUrl: true });
                    },
                    error: (err: any) => {
                        this.toast.error(err?.error?.error || 'Payment verification could not be completed.', 'Verification Notice');
                        this.router.navigate([], { queryParams: {}, replaceUrl: true });
                    }
                });
            }
        });
    }
}
