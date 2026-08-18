import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
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
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe, StudentSearchDropdownComponent],
  templateUrl: './logistics-dashboard.component.html',
  styleUrl: './logistics-dashboard.component.css'
})
export class LogisticsDashboardComponent implements OnInit {
  private logisticsService = inject(LogisticsService);
  private dialog = inject(DialogService);

  activeTab = signal<'transport' | 'canteen'>('transport');

  // Transport State
  routes = signal<TransportRoute[]>([]);
  showAddRoute = signal(false);
  savingRoute = signal(false);
  newRoute: Partial<TransportRoute> = { name: '', driver_name: '', vehicle_info: '', daily_fee: 0 };

  // Bus Assignment State
  showAssignBus = signal(false);
  savingAssignment = signal(false);
  newAssignment: Partial<BusAssignment> = { student_id: '', route_id: '', pick_up: '', drop_off: '' };

  // Canteen State
  mealPlans = signal<MealPlan[]>([]);
  showAddMealPlan = signal(false);
  savingMealPlan = signal(false);
  newMealPlan: Partial<MealPlan> = { name: '', description: '', term_fee: 0 };

  // Canteen Subscription State
  showSubscribe = signal(false);
  savingSubscription = signal(false);
  newSubscription: Partial<CanteenSubscription> = { student_id: '', meal_plan_id: '', term: '' };

  isLoading = signal(false);


  // Student Search
  students = signal<Student[]>([]);

  private studentService = inject(StudentService);

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
    if (student.id) {
        this.newAssignment.student_id = student.id;
    }
  }

  getRouteFee(routeId: string | undefined): number {
    if (!routeId) return 0;
    const r = this.routes().find(r => r.id === routeId);
    return r?.daily_fee || 0;
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
    this.newRoute = { name: '', driver_name: '', vehicle_info: '', daily_fee: 0 };
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
        this.dialog.alert('Failed to save route: ' + err.message, 'Error', 'info', 'OK');
      }
    });
  }

  openAssignBus() {
    this.newAssignment = { student_id: '', route_id: '', pick_up: '', drop_off: '' };
    
    this.showAssignBus.set(true);
  }

  saveAssignment() {
    if (!this.newAssignment.student_id || !this.newAssignment.route_id) {
      this.dialog.alert('Student ID and Route are required.', 'Validation Error', 'warning', 'OK');
      return;
    }
    this.savingAssignment.set(true);
    this.logisticsService.assignTransport(this.newAssignment).subscribe({
      next: () => {
        this.savingAssignment.set(false);
        this.showAssignBus.set(false);
        this.dialog.alert('Student assigned to bus route.', 'Success', 'info', 'OK');
      },
      error: (err) => {
        this.savingAssignment.set(false);
        this.dialog.alert('Failed to assign: ' + err.message, 'Error', 'info', 'OK');
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
        this.dialog.alert('Failed to save meal plan: ' + err.message, 'Error', 'info', 'OK');
      }
    });
  }

  openSubscribe() {
    this.newSubscription = { student_id: '', meal_plan_id: '', term: '' };
    this.showSubscribe.set(true);
  }

  saveSubscription() {
    if (!this.newSubscription.student_id || !this.newSubscription.meal_plan_id) {
      this.dialog.alert('Student ID and Meal Plan are required.', 'Validation Error', 'warning', 'OK');
      return;
    }
    this.savingSubscription.set(true);
    this.logisticsService.subscribeCanteen(this.newSubscription).subscribe({
      next: () => {
        this.savingSubscription.set(false);
        this.showSubscribe.set(false);
        this.dialog.alert('Student subscribed to meal plan.', 'Success', 'info', 'OK');
      },
      error: (err) => {
        this.savingSubscription.set(false);
        this.dialog.alert('Failed to subscribe: ' + err.message, 'Error', 'info', 'OK');
      }
    });
  }
}
