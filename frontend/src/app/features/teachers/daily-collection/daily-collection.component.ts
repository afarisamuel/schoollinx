import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FiscalService, DailyBill } from '../../../core/infrastructure/fiscal/fiscal.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { LogisticsService } from '../../../core/infrastructure/logistics/logistics.service';
import { TransportRoute } from '../../../core/domain/logistics.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-daily-collection',
    standalone: true,
    imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule],
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
    isLoading = signal(true);
    isCollecting = signal<string | null>(null); // billId being processed
    isGenerating = signal(false);
    activePeriodId = signal<string | null>(null);

    today = new Date();

    filteredBills = computed(() => {
        const q = this.searchTerm().toLowerCase();
        return this.pendingBills().filter(b =>
            !q ||
            b.student?.first_name?.toLowerCase().includes(q) ||
            b.student?.last_name?.toLowerCase().includes(q) ||
            b.student_id.toLowerCase().includes(q)
        );
    });

    ngOnInit() {
        this.periodService.getAll().subscribe({
            next: (periods) => {
                const active = periods.find(p => p.is_active);
                if (active) this.activePeriodId.set(active.id);
            }
        });
        
        this.logisticsService.getRoutes().subscribe({
            next: (routes) => {
                this.routes.set(routes);
            }
        });

        this.loadMyCollections();
        this.isLoading.set(false); // Initially false until a route is selected
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
                    this.loadMyCollections(); // Refresh collections side-pane
                },
                error: (err) => {
                    this.isCollecting.set(null);
                    this.dialog.alert(err?.error?.error || 'Failed to collect fee.', 'Error', 'danger');
                }
            });
        });
    }
}
