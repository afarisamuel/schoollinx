import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

@Component({
  selector: 'app-setup-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './setup-password.component.html',
  styleUrl: './setup-password.component.css'
})
export class SetupPasswordComponent implements OnInit {
  setupForm: FormGroup;
  token: string | null = null;
  loading = false;
  error = '';
  success = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.setupForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.error = 'Invalid or missing setup token. Please check your email link.';
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  onSubmit() {
    if (this.setupForm.invalid || !this.token) return;
    
    this.loading = true;
    this.error = '';
    this.success = '';

    const newPassword = this.setupForm.get('newPassword')?.value;

    this.authService.setupPassword(this.token, newPassword).subscribe({
      next: (res) => {
        this.success = 'Password set successfully! Redirecting to login...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to set password. Link may be expired.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
