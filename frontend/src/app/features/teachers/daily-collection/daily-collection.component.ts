import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FiscalService, DailyBill, DailyReconciliationSummary } from '../../../core/infrastructure/fiscal/fiscal.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { LogisticsService } from '../../../core/infrastructure/logistics/logistics.service';
import { TransportRoute } from '../../../core/domain/logistics.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-daily-collection',
    standalone: true,
    imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule, RouterLink],
    templateUrl: './daily-collection.component.html',
    styleUrl: './daily-collection.component.css'
})
export class DailyCollectionComponent implements OnInit {
    private fiscalService = inject(FiscalService);
    private periodService = inject(AcademicPeriodService);
    private logisticsService = inject(LogisticsService);
    private dialog = inject(DialogService);

    // State
    routes = signal<TransportRoute[]>([]);
    selectedRouteId = signal<string>(''); // Can be a route ID or 'walk-ins'
    
    pendingBills = signal<DailyBill[]>([]);
    myCollections = signal<DailyBill[]>([]);
    myTotal = signal(0);
    searchTerm = signal('');
    auditSearchTerm = signal('');
    isLoading = signal(true);
    isCollecting = signal<string | null>(null); // billId being processed
    isGenerating = signal(false);
    isBatchCollecting = signal(false);
    activePeriodId = signal<string | null>(null);
    activePeriodName = signal<string>('Current Term');
    viewMode = signal<'grid' | 'table'>('grid');
    filterScope = signal<'all' | 'high' | 'standard'>('all');

    // Batch Selection State
    selectedBillIds = signal<Set<string>>(new Set());

    // Scanner Mode State
    scanInput = signal('');
    isScanning = signal(false);
    scanFeedback = signal<{ type: 'success' | 'error' | 'info'; message: string; bill?: DailyBill } | null>(null);
    showScannerDrawer = signal(false);

    // Shift Handover & Reconciliation Modal State
    showHandoverModal = signal(false);
    reconciliationData = signal<DailyReconciliationSummary | null>(null);
    isLoadingReconciliation = signal(false);
    handoverNotes = signal('');
    handoverDenominations = signal<{ [key: string]: number }>({
        '200': 0,
        '100': 0,
        '50': 0,
        '20': 0,
        '10': 0,
        '5': 0,
        '2': 0,
        '1': 0,
        '0.5': 0
    });

    today = new Date();

    // Computed Telemetry
    pendingTotal = computed(() => {
        return this.pendingBills().reduce((acc, bill) => acc + (bill.amount || 0), 0);
    });

    totalScopeBillsCount = computed(() => {
        return this.pendingBills().length + this.myCollections().length;
    });

    clearanceRate = computed(() => {
        const total = this.totalScopeBillsCount();
        if (!total) return 0;
        return Math.round((this.myCollections().length / total) * 100);
    });

    selectedRouteDetails = computed(() => {
        const id = this.selectedRouteId();
        if (!id) return null;
        if (id === 'walk-ins') {
            return { name: 'Walk-in Scholars (Canteen Only)', rate: 0, isWalkIn: true };
        }
        const route = this.routes().find(r => r.id === id);
        return route ? { name: route.name, rate: route.daily_fee, isWalkIn: false } : null;
    });

    filteredBills = computed(() => {
        const q = this.searchTerm().toLowerCase();
        const scope = this.filterScope();

        return this.pendingBills().filter(b => {
            const matchesSearch = !q ||
                b.student?.first_name?.toLowerCase().includes(q) ||
                b.student?.last_name?.toLowerCase().includes(q) ||
                b.student_id.toLowerCase().includes(q);

            if (!matchesSearch) return false;

            if (scope === 'high') return b.amount >= 15;
            if (scope === 'standard') return b.amount < 15;
            return true;
        });
    });

    selectedPendingBillsCount = computed(() => this.selectedBillIds().size);
    selectedPendingBillsTotal = computed(() => {
        const ids = this.selectedBillIds();
        return this.pendingBills()
            .filter(b => ids.has(b.id))
            .reduce((acc, b) => acc + (b.amount || 0), 0);
    });

    isAllSelected = computed(() => {
        const list = this.filteredBills();
        if (list.length === 0) return false;
        return list.every(b => this.selectedBillIds().has(b.id));
    });

    // Handover physical cash calculation
    physicalCashTotal = computed(() => {
        const denoms = this.handoverDenominations();
        let sum = 0;
        for (const [denom, count] of Object.entries(denoms)) {
            sum += parseFloat(denom) * (count || 0);
        }
        return sum;
    });

    handoverDiscrepancy = computed(() => {
        return this.physicalCashTotal() - this.myTotal();
    });

    filteredAuditCollections = computed(() => {
        const q = this.auditSearchTerm().toLowerCase();
        if (!q) return this.myCollections();
        return this.myCollections().filter(b => 
            b.student?.first_name?.toLowerCase().includes(q) ||
            b.student?.last_name?.toLowerCase().includes(q) ||
            b.student_id.toLowerCase().includes(q)
        );
    });

    ngOnInit() {
        this.periodService.getAll().subscribe({
            next: (periods) => {
                const active = periods.find(p => p.is_active);
                if (active) {
                    this.activePeriodId.set(active.id);
                    this.activePeriodName.set(active.name || 'Active Term');
                }
            }
        });
        
        this.logisticsService.getRoutes().subscribe({
            next: (routes) => {
                this.routes.set(routes);
            }
        });

        this.loadMyCollections();
        this.isLoading.set(false);
    }

    loadMyCollections() {
        this.fiscalService.getMyCollections().subscribe({
            next: (res) => {
                this.myCollections.set(res.bills ?? []);
                this.myTotal.set(res.total_collected ?? 0);
            }
        });
    }

    onRouteSelected() {
        this.selectedBillIds.set(new Set());
        if (!this.selectedRouteId()) {
            this.pendingBills.set([]);
            return;
        }
        this.loadData();
    }

    loadData() {
        const routeId = this.selectedRouteId();
        if (!routeId) return;

        this.isLoading.set(true);

        const request$ = routeId === 'walk-ins' 
            ? this.fiscalService.getPendingBillsForWalkIns()
            : this.fiscalService.getPendingBillsByRoute(routeId);

        request$.subscribe({
            next: (res) => {
                this.pendingBills.set(res.bills ?? []);
                this.isLoading.set(false);
            },
            error: () => {
                this.pendingBills.set([]);
                this.isLoading.set(false);
            }
        });
    }

    toggleSelectBill(id: string) {
        const updated = new Set(this.selectedBillIds());
        if (updated.has(id)) {
            updated.delete(id);
        } else {
            updated.add(id);
        }
        this.selectedBillIds.set(updated);
    }

    clearSelection() {
        this.selectedBillIds.set(new Set());
    }

    private playAudioBeep(type: 'success' | 'error') {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'success') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            } else {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
                osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15); // E3
                gain.gain.setValueAtTime(0.4, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.35);
            }
        } catch (e) {
            // Audio context safely ignored if blocked by autoplay policy
        }
    }

    completeHandover() {
        const expected = this.myTotal();
        const actual = this.physicalCashTotal();
        const denoms = JSON.stringify(this.handoverDenominations());
        const notes = this.handoverNotes();

        this.fiscalService.submitHandover({
            expected_cash: expected,
            actual_cash: actual,
            denominations_json: denoms,
            notes: notes
        }).subscribe({
            next: () => {
                this.closeHandoverModal();
                this.dialog.alert('Shift Handover Sheet successfully recorded and logged for Bursar verification.', 'Handover Recorded', 'success');
            },
            error: (err) => {
                this.dialog.alert(err?.error?.error || 'Failed to submit handover record.', 'Handover Error', 'danger');
            }
        });
    }

    toggleSelectAll() {
        const currentList = this.filteredBills();
        const currentSelected = this.selectedBillIds();
        if (this.isAllSelected()) {
            const updated = new Set(currentSelected);
            currentList.forEach(b => updated.delete(b.id));
            this.selectedBillIds.set(updated);
        } else {
            const updated = new Set(currentSelected);
            currentList.forEach(b => updated.add(b.id));
            this.selectedBillIds.set(updated);
        }
    }

    batchCollectSelected() {
        const ids = Array.from(this.selectedBillIds());
        if (ids.length === 0) return;

        const totalAmount = this.selectedPendingBillsTotal();

        this.dialog.confirm(
            `Record collection of GH₵${totalAmount.toFixed(2)} for ${ids.length} selected students?`,
            `Batch Collection (${ids.length} Students)`,
            'info',
            'Confirm Batch Collect'
        ).subscribe(confirmed => {
            if (!confirmed) return;
            this.isBatchCollecting.set(true);
            this.fiscalService.batchCollectBills(ids).subscribe({
                next: (res) => {
                    this.isBatchCollecting.set(false);
                    this.selectedBillIds.set(new Set());
                    this.loadData();
                    this.loadMyCollections();
                    this.playAudioBeep('success');
                    this.dialog.alert(`Successfully processed ${res.count} daily bills.`, 'Batch Complete', 'success');
                },
                error: (err) => {
                    this.isBatchCollecting.set(false);
                    this.playAudioBeep('error');
                    this.dialog.alert(err?.error?.error || 'Failed to process batch collection.', 'Error', 'danger');
                }
            });
        });
    }

    handleScanSubmit() {
        const code = this.scanInput().trim();
        if (!code) return;

        this.isScanning.set(true);
        this.fiscalService.quickCollectStudent(code).subscribe({
            next: (res) => {
                this.isScanning.set(false);
                this.scanInput.set('');
                const s = res.bill?.student;
                const name = s ? `${s.first_name} ${s.last_name}` : 'Student';
                this.scanFeedback.set({
                    type: 'success',
                    message: `Collected GH₵${res.bill?.amount?.toFixed(2)} from ${name}`,
                    bill: res.bill
                });
                this.playAudioBeep('success');
                this.loadData();
                this.loadMyCollections();
            },
            error: (err) => {
                this.isScanning.set(false);
                this.playAudioBeep('error');
                this.scanFeedback.set({
                    type: 'error',
                    message: err?.error?.error || 'Quick collect scan failed'
                });
            }
        });
    }

    openHandoverModal() {
        this.showHandoverModal.set(true);
        this.isLoadingReconciliation.set(true);
        this.fiscalService.getReconciliationSummary().subscribe({
            next: (data) => {
                this.reconciliationData.set(data);
                this.isLoadingReconciliation.set(false);
            },
            error: () => {
                this.isLoadingReconciliation.set(false);
            }
        });
    }

    closeHandoverModal() {
        this.showHandoverModal.set(false);
    }

    updateDenom(denomKey: string, val: string) {
        const parsed = parseInt(val, 10) || 0;
        const copy = { ...this.handoverDenominations() };
        copy[denomKey] = Math.max(0, parsed);
        this.handoverDenominations.set(copy);
    }

    printHandoverManifest() {
        window.print();
    }

    generateBills() {
        const periodId = this.activePeriodId();
        if (!periodId) {
            this.dialog.alert('No active academic period found. Please set an active period first.', 'No Active Period', 'warning');
            return;
        }

        const routeId = this.selectedRouteId();
        if (!routeId) return;

        const isWalkIns = routeId === 'walk-ins';
        const routeName = isWalkIns ? 'Walk-in Students' : this.routes().find(r => r.id === routeId)?.name || 'Selected Route';

        this.dialog.confirm(
            `Generate daily fee bills for ${routeName} for today? Only students without existing bills today will be billed.`,
            `Generate Bills for ${routeName}`,
            'info',
            'Generate Bills'
        ).subscribe(confirmed => {
            if (!confirmed) return;
            this.isGenerating.set(true);
            
            const request$ = isWalkIns 
                ? this.fiscalService.generateDailyBillsForWalkIns(periodId)
                : this.fiscalService.generateDailyBillsForRoute(routeId, periodId);

            request$.subscribe({
                next: (res) => {
                    this.isGenerating.set(false);
                    if (res.count === 0) {
                        this.dialog.alert(
                            `No new bills were generated. All applicable students already have a bill for today.`,
                            'No New Bills',
                            'info'
                        ).subscribe(() => this.loadData());
                    } else {
                        this.dialog.alert(
                            `Successfully generated <strong>${res.count}</strong> bills at <strong>GH₵${res.amount?.toFixed(2)}</strong> each. Included fees: ${res.categories?.join(', ')}.`,
                            'Bills Generated',
                            'success'
                        ).subscribe(() => this.loadData());
                    }
                },
                error: (err) => {
                    this.isGenerating.set(false);
                    const msg = err?.error?.error || 'Failed to generate bills.';
                    this.dialog.alert(msg, 'Generation Failed', 'danger');
                }
            });
        });
    }

    collect(bill: DailyBill) {
        this.dialog.confirm(
            `Collect fee of GH₵${bill.amount.toFixed(2)} from ${bill.student?.first_name} ${bill.student?.last_name}?`,
            'Collect Daily Fee',
            'info',
            'Collect'
        ).subscribe(confirmed => {
            if (!confirmed) return;
            this.isCollecting.set(bill.id);
            this.fiscalService.collectBill(bill.id).subscribe({
                next: () => {
                    this.isCollecting.set(null);
                    this.loadData();
                    this.loadMyCollections();
                },
                error: (err) => {
                    this.isCollecting.set(null);
                    this.dialog.alert(err?.error?.error || 'Failed to collect fee.', 'Error', 'danger');
                }
            });
        });
    }

    exportAuditCsv() {
        const collections = this.myCollections();
        if (collections.length === 0) {
            this.dialog.alert('No collections logged today to export.', 'Empty Ledger', 'info');
            return;
        }

        const headers = ['Receipt / Bill ID', 'Student Name', 'Student ID', 'Amount (GHS)', 'Collection Time', 'Status'];
        const rows = collections.map(b => [
            b.id,
            `"${b.student?.first_name ?? ''} ${b.student?.last_name ?? ''}"`,
            b.student_id,
            (b.amount || 0).toFixed(2),
            b.collected_at ? new Date(b.collected_at).toLocaleTimeString() : 'N/A',
            'COLLECTED'
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Daily_Collection_Shift_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


