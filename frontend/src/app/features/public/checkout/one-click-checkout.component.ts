import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SeoService } from '../../../shared/services/seo';

interface InvoiceDetails {
  invoice_id: string;
  category: string;
  description: string;
  amount: number;
  amount_paid: number;
  balance: number;
  due_date: string;
  status: string;
  term_name: string;
  academic_year: string;
  student_name: string;
  school_name: string;
  subdomain: string;
}

@Component({
  selector: 'app-one-click-checkout', standalone: true, imports: [CommonModule, FormsModule, RouterModule, CurrencyPipe, DatePipe], template: ` <div class="min-h-screen text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-12 font-sans selection:bg-indigo-500 selection:text-white"> <!-- Top Brand Header --> <header class="max-w-4xl w-full mx-auto flex items-center justify-between py-4 border-b border-white/10 mb-8"> <div class="flex items-center gap-3"> <div class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-lg text-lg"> {{ (invoice()?.school_name?.[0] ||'S') }}
          </div>
          <div>
            <h1 class="font-bold text-lg text-white leading-tight">{{ invoice()?.school_name || 'SchoolLinx Portal' }}</h1>
            <p class="text-xs text-indigo-300 font-medium">Verified Payment Gateway</p>
          </div>
        </div>

        <div class="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          256-Bit SSL Encrypted
        </div>
      </header>

      <!-- Main Content Card -->
      <main class="max-w-xl w-full mx-auto my-auto">
        
        <!-- Loading State -->
        <div *ngIf="isLoading()" class="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center shadow-2xl">
          <div class="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-slate-400 font-medium text-sm">Retrieving invoice details securely...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="!isLoading() && errorMessage()" class="bg-slate-900/80 backdrop-blur-xl border border-rose-500/20 rounded-3xl p-8 text-center shadow-2xl">
          <div class="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h2 class="text-xl font-bold text-white mb-2">Invoice Not Found</h2>
          <p class="text-slate-400 text-sm mb-6">{{ errorMessage() }}</p>
          <a routerLink="/" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-all">
            Return to Home
          </a>
        </div>

        <!-- Success/Paid Receipt State -->
        <div *ngIf="!isLoading() && (isPaid() || isPaymentSuccess())" class="bg-slate-900/90 backdrop-blur-2xl border border-emerald-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div class="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div class="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/10">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          </div>

          <div class="text-center mb-8">
            <span class="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Payment Completed
            </span>
            <h2 class="text-2xl font-black text-white mt-3">Official Fee Receipt</h2>
            <p class="text-xs text-slate-400 mt-1">Settled securely via Paystack Instant Checkout</p>
          </div>

          <div class="bg-slate-950/60 rounded-2xl p-5 border border-white/5 space-y-3.5 mb-6 text-sm">
            <div class="flex justify-between items-center text-slate-400">
              <span>Student</span>
              <span class="font-semibold text-slate-100">{{ invoice()?.student_name }}</span>
            </div>
            <div class="flex justify-between items-center text-slate-400">
              <span>Bill Category</span>
              <span class="font-semibold text-slate-100">{{ invoice()?.category }} ({{ invoice()?.term_name }})</span>
            </div>
            <div class="flex justify-between items-center text-slate-400">
              <span>Total Invoiced</span>
              <span class="font-semibold text-slate-100">{{ invoice()?.amount | currency:'GHS ':'symbol':'1.2-2' }}</span>
            </div>
            <div class="flex justify-between items-center text-slate-400 pt-2 border-t border-white/10 font-bold">
              <span class="text-emerald-400">Total Paid</span>
              <span class="text-lg text-emerald-400">{{ invoice()?.amount_paid | currency:'GHS ':'symbol':'1.2-2' }}</span>
            </div>
          </div>

          <div class="text-center">
            <button onclick="window.print()" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2 mx-auto">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              Print Receipt
            </button>
          </div>
        </div>

        <!-- Checkout Form State -->
        <div *ngIf="!isLoading() && invoice() && !isPaid() && !isPaymentSuccess()" class="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          
          <div class="mb-6">
            <div class="flex justify-between items-start">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                  {{ invoice()?.category }}
                </span>
                <h2 class="text-2xl font-black text-white mt-2">{{ invoice()?.student_name }}</h2>
                <p class="text-xs text-slate-400">{{ invoice()?.term_name }} &bull; {{ invoice()?.academic_year }}</p>
              </div>
              <div class="text-right">
                <span class="text-xs text-slate-400 block font-medium">Balance Due</span>
                <span class="text-2xl font-black text-emerald-400">{{ invoice()?.balance | currency:'GHS ':'symbol':'1.2-2' }}</span>
              </div>
            </div>
          </div>

          <!-- Breakdown Summary -->
          <div class="bg-slate-950/50 rounded-2xl p-4 border border-white/5 space-y-2.5 mb-6 text-xs text-slate-300">
            <div class="flex justify-between">
              <span>Description:</span>
              <span class="text-slate-100 font-medium">{{ invoice()?.description || 'School Term Fees' }}</span>
            </div>
            <div class="flex justify-between">
              <span>Total Bill:</span>
              <span class="text-slate-100 font-medium">{{ invoice()?.amount | currency:'GHS ':'symbol':'1.2-2' }}</span>
            </div>
            <div class="flex justify-between" *ngIf="(invoice()?.amount_paid || 0) > 0">
              <span>Already Paid:</span>
              <span class="text-emerald-400 font-medium">-{{ invoice()?.amount_paid | currency:'GHS ':'symbol':'1.2-2' }}</span>
            </div>
            <div class="flex justify-between" *ngIf="invoice()?.due_date">
              <span>Due Date:</span>
              <span class="text-amber-400 font-medium">{{ invoice()?.due_date | date:'mediumDate'}}</span> </div> </div> <!-- Payment Form --> <form (ngSubmit)="initiatePayment()" class="space-y-4"> <div> <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"> Amount to Pay (GHS) </label> <div class="relative"> <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₵</span> <input type="number" [(ngModel)]="paymentAmount" name="paymentAmount" [max]="invoice()?.balance || 99999" min="1" step="0.01" required class="w-full bg-slate-950/80 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-white font-bold text-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"> </div> </div> <div> <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"> Email for Receipt </label> <input type="email" [(ngModel)]="payerEmail" name="payerEmail" placeholder="parent@example.com" required class="w-full bg-slate-950/80 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"> </div> <!-- Submit Button --> <button type="submit" [disabled]="isSubmitting() || paymentAmount <= 0" class="w-full mt-2 py-4 hover: hover: disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 text-base"> <svg *ngIf="isSubmitting()" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span>{{ isSubmitting() ?'Connecting to Paystack...' : 'Pay ₵' + (paymentAmount | number:'1.2-2') + ' with Paystack' }}</span>
              <svg *ngIf="!isSubmitting()" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </form>

          <!-- Accepted Payment Badges -->
          <div class="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-slate-400 text-xs">
            <span>Accepted via Paystack:</span>
            <div class="flex items-center gap-2 font-semibold text-slate-300">
              <span class="bg-white/5 px-2 py-1 rounded">MTN MoMo</span>
              <span class="bg-white/5 px-2 py-1 rounded">Telecel Cash</span>
              <span class="bg-white/5 px-2 py-1 rounded">Visa/Mastercard</span>
            </div>
          </div>
        </div>

      </main>

      <!-- Footer -->
      <footer class="max-w-4xl w-full mx-auto py-4 text-center text-xs text-slate-400">
        Powered by <strong class="text-white font-bold">SchoolLinx Cloud ERP</strong> &bull; Payments processed securely via Paystack
      </footer>

    </div>
  `
})
export class OneClickCheckoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private seo = inject(SeoService);

  invoice = signal<InvoiceDetails | null>(null);
  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMessage = signal('');
  isPaymentSuccess = signal(false);

  paymentAmount = 0;
  payerEmail = '';
  invoiceId = '';

  isPaid(): boolean {
    const inv = this.invoice();
    return !!inv && (inv.status === 'PAID' || inv.balance <= 0);
  }

  ngOnInit(): void {
    this.seo.updateMeta({
      title: 'Online School Fee Settlement — Secure Paystack Checkout',
      description: 'Secure online fee settlement gateway for parents and guardians powered by SchoolLinx.',
      noindex: true
    });

    this.invoiceId = this.route.snapshot.paramMap.get('id') || '';
    const verified = this.route.snapshot.queryParamMap.get('verified');
    if (verified === 'true') {
      this.isPaymentSuccess.set(true);
    }

    if (!this.invoiceId) {
      this.errorMessage.set('No invoice identifier was provided in the URL.');
      this.isLoading.set(false);
      return;
    }

    this.loadInvoiceDetails();
  }

  loadInvoiceDetails(): void {
    this.isLoading.set(true);
    this.http.get<InvoiceDetails>(`${environment.apiUrl}/public/checkout/invoice/${this.invoiceId}`).subscribe({
      next: (data) => {
        this.invoice.set(data);
        this.paymentAmount = data.balance > 0 ? data.balance : data.amount;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || 'Unable to find or load this invoice.');
        this.isLoading.set(false);
      }
    });
  }

  initiatePayment(): void {
    if (this.paymentAmount <= 0) return;
    this.isSubmitting.set(true);

    const payload = {
      invoice_id: this.invoiceId,
      email: this.payerEmail || 'parent@schoollinx.com',
      amount: this.paymentAmount,
      callback_url: window.location.origin + `/pay/${this.invoiceId}?verified=true`
    };

    this.http.post<{ authorization_url: string }>(`${environment.apiUrl}/public/checkout/initialize`, payload).subscribe({
      next: (res) => {
        if (res.authorization_url) {
          window.location.href = res.authorization_url;
        } else {
          this.isSubmitting.set(false);
          alert('Failed to initialize payment gateway.');
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err?.error?.error || 'Failed to initialize payment.');
      }
    });
  }
}
