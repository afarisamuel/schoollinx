import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentSearchDropdownComponent } from '../../../shared/ui/student-search-dropdown/student-search-dropdown.component';
import { LogisticsService } from '../../../core/infrastructure/logistics/logistics.service';
import { TransportRoute, BusAssignment, MealPlan, CanteenSubscription } from '../../../core/domain/logistics.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { Student } from '../../../core/domain/student.model';

@Component({
  selector: 'app-logistics-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, StudentSearchDropdownComponent],
  templateUrl: './logistics-dashboard.component.html',
  styleUrl: './logistics-dashboard.component.css'
})
export class LogisticsDashboardComponent implements OnInit {
  private logisticsService = inject(LogisticsService);
  private dialog = inject(DialogService);
  private studentService = inject(StudentService);

  activeTab = signal<'transport' | 'canteen'>('transport');

  // Transport State
  routes = signal<TransportRoute[]>([]);
  showAddRoute = signal(false);
  savingRoute = signal(false);
  newRoute: Partial<TransportRoute> = {
    name: '', driver_name: '', driver_phone: '', vehicle_info: '',
    vehicle_plate: '', capacity: 32, daily_fee: 0
  };

  // Passenger Roster Drawer
  passengerRoute = signal<TransportRoute | null>(null);
  passengers = signal<BusAssignment[]>([]);
  loadingPassengers = signal(false);
  showPassengersDrawer = signal(false);

  // Search
  routeSearch = signal('');

  // Bus Assignment State
  showAssignBus = signal(false);
  savingAssignment = signal(false);
  newAssignment: Partial<BusAssignment> = { student_id: '', route_id: '', pick_up: '', drop_off: '' };

  // Canteen State
  mealPlans = signal<MealPlan[]>([]);
  showAddMealPlan = signal(false);
  savingMealPlan = signal(false);
  newMealPlan: Partial<MealPlan> = { name: '', description: '', term_fee: 0 };
  mealSearch = signal('');

  // Canteen Subscription State
  showSubscribe = signal(false);
  savingSubscription = signal(false);
  newSubscription: Partial<CanteenSubscription> = { student_id: '', meal_plan_id: '', term: '' };

  isLoading = signal(false);
  students = signal<Student[]>([]);

  // --- Computed: filtered routes
  filteredRoutes = computed(() => {
    const q = this.routeSearch().toLowerCase().trim();
    if (!q) return this.routes();
    return this.routes().filter(r =>
      r.name?.toLowerCase().includes(q) ||
      r.driver_name?.toLowerCase().includes(q) ||
      r.vehicle_info?.toLowerCase().includes(q)
    );
  });

  filteredMealPlans = computed(() => {
    const q = this.mealSearch().toLowerCase().trim();
    if (!q) return this.mealPlans();
    return this.mealPlans().filter(p => p.name?.toLowerCase().includes(q));
  });

  // Real revenue from actual assignments x fees
  totalTransportRevenue = computed(() =>
    this.routes().reduce((sum, r) => sum + (r.daily_fee || 0), 0)
  );

  totalMealRevenue = computed(() =>
    this.mealPlans().reduce((sum, p) => sum + (p.term_fee || 0), 0)
  );

  totalRevenue = computed(() => this.totalTransportRevenue() + this.totalMealRevenue());

  // Occupancy percent for a route
  occupancyPct(route: TransportRoute): number {
    if (!route.capacity) return 0;
    // We don't have live passenger counts per route here, so we display capacity info
    return 0;
  }

  ngOnInit() {
    this.loadRoutes();
    this.loadMealPlans();
    this.loadStudents();
  }

  loadStudents() {
    this.studentService.getStudents().subscribe({
      next: (data: Student[]) => this.students.set(data || [])
    });
  }

  selectStudent(student: Student) {
    if (student.id) this.newAssignment.student_id = student.id;
  }

  getRouteFee(routeId: string | undefined): number {
    if (!routeId) return 0;
    return this.routes().find(r => r.id === routeId)?.daily_fee || 0;
  }

  getRouteSeatsLeft(routeId: string): number {
    const route = this.routes().find(r => r.id === routeId);
    if (!route) return 0;
    return route.capacity || 0;
  }

  switchTab(tab: 'transport' | 'canteen') {
    this.activeTab.set(tab);
  }

  // --- Transport ---
  loadRoutes() {
    this.isLoading.set(true);
    this.logisticsService.getRoutes().subscribe({
      next: (routes) => {
        this.routes.set(routes || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openAddRoute() {
    this.newRoute = { name: '', driver_name: '', driver_phone: '', vehicle_info: '', vehicle_plate: '', capacity: 32, daily_fee: 0 };
    this.showAddRoute.set(true);
  }

  saveRoute() {
    if (!this.newRoute.name) {
      this.dialog.alert('Route name is required.', 'Validation Error', 'warning', 'OK');
      return;
    }
    this.savingRoute.set(true);
    this.logisticsService.addRoute(this.newRoute).subscribe({
      next: () => {
        this.savingRoute.set(false);
        this.showAddRoute.set(false);
        this.loadRoutes();
      },
      error: (err) => {
        this.savingRoute.set(false);
        this.dialog.alert('Failed to save route: ' + (err.error?.error || err.message), 'Error', 'danger', 'OK');
      }
    });
  }

  deleteRoute(route: TransportRoute) {
    this.dialog.confirm(
      `Delete "${route.name}"? All student assignments for this route will also be removed.`,
      'Delete Route',
      'warning',
      'Delete'
    ).subscribe(confirmed => {
      if (!confirmed) return;
      this.logisticsService.deleteRoute(route.id!).subscribe({
        next: () => this.loadRoutes(),
        error: (err) => this.dialog.alert(err.error?.error || 'Failed to delete route.', 'Error', 'danger', 'OK')
      });
    });
  }

  openPassengersDrawer(route: TransportRoute) {
    this.passengerRoute.set(route);
    this.passengers.set([]);
    this.loadingPassengers.set(true);
    this.showPassengersDrawer.set(true);
    this.logisticsService.getRoutePassengers(route.id!).subscribe({
      next: (data) => {
        this.passengers.set(data || []);
        this.loadingPassengers.set(false);
      },
      error: () => this.loadingPassengers.set(false)
    });
  }

  closePassengersDrawer() {
    this.showPassengersDrawer.set(false);
    this.passengerRoute.set(null);
    this.passengers.set([]);
  }

  printManifest() {
    if (typeof window !== 'undefined') window.print();
  }

  openAssignBus() {
    this.newAssignment = { student_id: '', route_id: '', pick_up: '', drop_off: '' };
    this.showAssignBus.set(true);
  }

  saveAssignment() {
    if (!this.newAssignment.student_id || !this.newAssignment.route_id) {
      this.dialog.alert('Student and Route are required.', 'Validation Error', 'warning', 'OK');
      return;
    }
    this.savingAssignment.set(true);
    this.logisticsService.assignTransport(this.newAssignment).subscribe({
      next: () => {
        this.savingAssignment.set(false);
        this.showAssignBus.set(false);
        this.dialog.alert('Student assigned to bus route successfully.', 'Assigned', 'success', 'OK');
      },
      error: (err) => {
        this.savingAssignment.set(false);
        this.dialog.alert('Failed to assign: ' + (err.error?.error || err.message), 'Error', 'danger', 'OK');
      }
    });
  }

  // --- Canteen ---
  loadMealPlans() {
    this.logisticsService.getMealPlans().subscribe({
      next: (plans) => this.mealPlans.set(plans || []),
      error: () => {}
    });
  }

  openAddMealPlan() {
    this.newMealPlan = { name: '', description: '', term_fee: 0 };
    this.showAddMealPlan.set(true);
  }

  saveMealPlan() {
    if (!this.newMealPlan.name) {
      this.dialog.alert('Meal plan name is required.', 'Validation Error', 'warning', 'OK');
      return;
    }
    this.savingMealPlan.set(true);
    this.logisticsService.addMealPlan(this.newMealPlan).subscribe({
      next: () => {
        this.savingMealPlan.set(false);
        this.showAddMealPlan.set(false);
        this.loadMealPlans();
      },
      error: (err) => {
        this.savingMealPlan.set(false);
        this.dialog.alert('Failed to save meal plan: ' + (err.error?.error || err.message), 'Error', 'danger', 'OK');
      }
    });
  }

  openSubscribe() {
    this.newSubscription = { student_id: '', meal_plan_id: '', term: '' };
    this.showSubscribe.set(true);
  }

  saveSubscription() {
    if (!this.newSubscription.student_id || !this.newSubscription.meal_plan_id) {
      this.dialog.alert('Student and Meal Plan are required.', 'Validation Error', 'warning', 'OK');
      return;
    }
    this.savingSubscription.set(true);
    this.logisticsService.subscribeCanteen(this.newSubscription).subscribe({
      next: () => {
        this.savingSubscription.set(false);
        this.showSubscribe.set(false);
        this.dialog.alert('Student subscribed to meal plan.', 'Success', 'success', 'OK');
      },
      error: (err) => {
        this.savingSubscription.set(false);
        this.dialog.alert('Failed to subscribe: ' + (err.error?.error || err.message), 'Error', 'danger', 'OK');
      }
    });
  }
}
