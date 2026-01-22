import { Component, Input, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, RouterModule],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss']
})
export class PageHeaderComponent implements OnInit, AfterViewInit {
  @Input() title = '';
  @Input() description = '';
  @Input() showBackButton: boolean = true;
  @ViewChild('actionsContent', { read: ElementRef }) actionsContent?: ElementRef;
  
  shouldShowBack: boolean = true;
  isProjectsList: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isProjectsList = this.router.url === '/projects' || this.router.url.startsWith('/projects?');
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.actionsContent?.nativeElement) {
        const hasBackButton = this.actionsContent.nativeElement.querySelector('mat-icon[class*="arrow_back"]');
        this.shouldShowBack = !hasBackButton && this.showBackButton && !this.isProjectsList;
        this.cdr.detectChanges();
      }
    }, 0);
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }
}

