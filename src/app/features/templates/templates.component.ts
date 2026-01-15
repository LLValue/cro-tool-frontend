import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent
  ],
  template: `
    <app-page-header
      title="Templates"
      description="Start faster with reusable experiment templates and prebuilt structures.">
    </app-page-header>
    
    <div class="templates-content">
      <mat-card>
        <mat-card-content>
          <p>Templates content coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
  `]
})
export class TemplatesComponent {
}

