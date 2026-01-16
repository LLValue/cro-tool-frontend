import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../data/auth.service';
import { ToastHelperService } from '../../../shared/toast-helper.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toast: ToastHelperService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Redirect to projects if already logged in
    this.authService.isLoggedIn$.pipe(take(1)).subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.router.navigate(['/projects']);
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.loginForm.disable();
      
      this.authService.login(email, password).subscribe({
        next: (success) => {
          if (success) {
            this.toast.showSuccess('Login successful');
            this.router.navigate(['/projects']);
          } else {
            this.toast.showError('Invalid email or password');
            this.loginForm.enable();
          }
        },
        error: (error) => {
          if (error.status === 0 || error.message?.includes('ECONNREFUSED')) {
            this.toast.showError('Cannot connect to server. Please make sure the backend is running on http://localhost:3000');
          } else if (error.status === 401) {
            this.toast.showError('Invalid email or password');
          } else {
            this.toast.showError('Login failed. Please try again.');
          }
          this.loginForm.enable();
        }
      });
    }
  }
}

