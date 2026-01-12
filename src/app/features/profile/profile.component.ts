import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { ToastHelperService } from '../../shared/toast-helper.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    CommonModule,
    PageHeaderComponent
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  emailForm: FormGroup;
  passwordForm: FormGroup;
  avatarUrl = 'https://cdn.iconscout.com/icon/free/png-256/free-avatar-icon-svg-download-png-456322.png';

  constructor(
    private fb: FormBuilder,
    private toast: ToastHelperService
  ) {
    this.emailForm = this.fb.group({
      currentEmail: [{ value: 'admin@crotool.com', disabled: true }],
      newEmail: ['', [Validators.required, Validators.email]],
      confirmEmail: ['', [Validators.required, Validators.email]]
    }, { validators: this.emailMatchValidator });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {}

  emailMatchValidator(form: FormGroup) {
    const newEmail = form.get('newEmail')?.value;
    const confirmEmail = form.get('confirmEmail')?.value;
    return newEmail === confirmEmail ? null : { emailMismatch: true };
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  onEmailChange(): void {
    if (this.emailForm.valid) {
      // Aquí iría la lógica para cambiar el email
      this.toast.showSuccess('Email updated successfully');
      this.emailForm.patchValue({
        newEmail: '',
        confirmEmail: ''
      });
    }
  }

  onPasswordChange(): void {
    if (this.passwordForm.valid) {
      // Aquí iría la lógica para cambiar la contraseña
      this.toast.showSuccess('Password updated successfully');
      this.passwordForm.reset();
    }
  }

  onAvatarChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarUrl = e.target.result;
        this.toast.showSuccess('Avatar updated successfully');
      };
      reader.readAsDataURL(file);
    }
  }

  triggerAvatarInput(): void {
    document.getElementById('avatar-input')?.click();
  }
}

