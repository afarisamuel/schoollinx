import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { Role } from '../../../core/domain/user.model';

@Component({
    selector: 'app-signup',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './signup.component.html',
    styleUrl: './signup.component.css'
})
export class SignupComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    signupForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        username: ['', [Validators.required, Validators.minLength(3)]],
        phoneNumber: [''],
        password: ['', [Validators.required, Validators.minLength(6)]],
        role: [Role.STUDENT, [Validators.required]]
    });

    roles = Object.values(Role);
    isLoading = false;
    errorMessage = '';

    onSubmit() {
        if (this.signupForm.invalid) {
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        this.authService.signup(this.signupForm.value).subscribe({
            next: (response: any) => {
                this.authService.handleLoginSuccess(response.token, response.tenant_subdomain);
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.errorMessage = err.error?.error || 'Registration failed. Please try again.';
                this.isLoading = false;
            }
        });
    }
}
