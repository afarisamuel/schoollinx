import { Component, OnInit, signal, inject, PLATFORM_ID, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentService, Department } from '../../../core/infrastructure/curriculum/department.service';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { Teacher } from '../../../core/domain/teacher.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-department-management',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './department-management.component.html',
    styleUrl: './department-management.component.css'
})
export class DepartmentManagementComponent implements OnInit {
    private deptService = inject(DepartmentService);
    private teacherService = inject(TeacherService);
    private dialog = inject(DialogService);
    private platformId = inject(PLATFORM_ID);

    departments = signal<Department[]>([]);
    teachers = signal<Teacher[]>([]);
    isAdding = signal(false);
    searchTerm = signal('');

    filteredDepartments = computed(() => {
        const term = this.searchTerm().toLowerCase();
        const depts = this.departments();
        if (!term) return depts;
        return depts.filter(d => 
            d.name.toLowerCase().includes(term) || 
            (d.head?.first_name?.toLowerCase().includes(term)) ||
            (d.head?.last_name?.toLowerCase().includes(term))
        );
    });

    stats = computed(() => {
        const depts = this.departments();
        return {
            total: depts.length,
            withHead: depts.filter(d => d.head_id).length,
            missingHead: depts.filter(d => !d.head_id).length
        };
    });

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadDepartments();
            this.loadTeachers();
        }
    }

    loadDepartments() {
        this.deptService.getDepartments().subscribe(data => {
            this.departments.set(data);
        });
    }

    onSearch(event: Event) {
        const input = event.target as HTMLInputElement;
        this.searchTerm.set(input.value);
    }

    loadTeachers() {
        this.teacherService.getTeachers().subscribe(data => {
            this.teachers.set(data);
        });
    }

    createDepartment(event: Event) {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);

        const dept: Partial<Department> = {
            name: formData.get('name') as string,
            head_id: (formData.get('head_id') as string) || undefined
        };

        this.deptService.createDepartment(dept).subscribe(() => {
            this.isAdding.set(false);
            this.loadDepartments();
        });
    }

    deleteDepartment(id: string) {
        this.dialog.confirm('Decommissioning a department will affect all constituent programs. Proceed?', 'Decommission Department', 'danger', 'Decommission').subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.deptService.deleteDepartment(id).subscribe(() => {
                    this.loadDepartments();
                });
            }
        });
    }

    manageClasses(dept: Department) {
        // Implementation for navigation can be added here
        console.log('Navigating to classes for:', dept.name);
    }
}
