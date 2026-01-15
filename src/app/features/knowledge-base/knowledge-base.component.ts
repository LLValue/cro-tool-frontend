import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';

@Component({
  selector: 'app-knowledge-base',
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
      title="Knowledge Base"
      description="Browse UX patterns, guidelines, and examples to inform your experiments.">
    </app-page-header>
    
    <div class="knowledge-base-content">
      <mat-card>
        <mat-card-content>
          <p>Knowledge Base content coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
  `]
})
export class KnowledgeBaseComponent {
}

