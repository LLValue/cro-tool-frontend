import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageHeaderComponent } from '../../../../shared/page-header/page-header.component';
import { ChipsInputComponent } from '../../../../shared/chips-input/chips-input.component';
import { ProjectsStoreService } from '../../../../data/projects-store.service';
import { OptimizationPoint, Variant } from '../../../../data/models';
import { ToastHelperService } from '../../../../shared/toast-helper.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-point-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatTooltipModule,
    PageHeaderComponent,
    ChipsInputComponent
  ],
  templateUrl: './point-detail.component.html',
  styleUrls: ['./point-detail.component.scss']
})
export class PointDetailComponent implements OnInit, OnDestroy {
  pointId: string = '';
  projectId: string = '';
  point: OptimizationPoint | null = null;
  variants: Variant[] = [];
  filteredVariants: Variant[] = [];
  variantFilter: string = 'all';
  
  setupForm: FormGroup;
  briefForm: FormGroup;
  
  goodIdeas: string[] = [];
  thingsToAvoid: string[] = [];
  mustIncludeKeywords: string[] = [];
  mustAvoidTerms: string[] = [];
  
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: ProjectsStoreService,
    private fb: FormBuilder,
    private toast: ToastHelperService
  ) {
    this.setupForm = this.fb.group({
      name: ['', Validators.required],
      elementType: ['Other'],
      selector: ['', Validators.required],
      deviceScope: ['All'],
      status: ['Active']
    });

    this.briefForm = this.fb.group({
      objective: [''],
      context: [''],
      minChars: [0],
      maxChars: [0],
      maxWords: [0]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.pointId = params['pointId'];
      this.projectId = params['projectId'] || this.route.snapshot.parent?.params['projectId'] || '';
      this.loadPoint();
      this.loadVariants();
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadPoint(): void {
    if (!this.pointId) return;
    
    const sub = this.store.points$.subscribe(points => {
      this.point = points.find(p => p.id === this.pointId) || null;
      if (this.point) {
        this.setupForm.patchValue({
          name: this.point.name || '',
          elementType: this.point.elementType || 'Other',
          selector: this.point.selector || '',
          deviceScope: this.point.deviceScope || 'All',
          status: this.point.status || 'Active'
        });

        this.briefForm.patchValue({
          objective: this.point.objective || '',
          context: (this.point as any).context || ''
        });

        const generationRules = this.point.generationRules ? JSON.parse(this.point.generationRules || '{}') : {};
        this.goodIdeas = generationRules.goodIdeas || [];
        this.thingsToAvoid = generationRules.thingsToAvoid || [];
        this.mustIncludeKeywords = generationRules.mustIncludeKeywords || [];
        this.mustAvoidTerms = generationRules.mustAvoidTerms || [];
        this.briefForm.patchValue({
          minChars: generationRules.minChars || 0,
          maxChars: generationRules.maxChars || 0,
          maxWords: generationRules.maxWords || 0
        });
      }
    });
    this.subscriptions.add(sub);
  }

  loadVariants(): void {
    if (!this.pointId) return;

    const sub = this.store.variants$.subscribe(variants => {
      this.variants = variants
        .filter(v => v.optimizationPointId === this.pointId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.filterVariants();
    });
    this.subscriptions.add(sub);

    this.store.listVariants(this.pointId).subscribe();
  }

  filterVariants(): void {
    if (this.variantFilter === 'all') {
      this.filteredVariants = this.variants;
    } else {
      this.filteredVariants = this.variants.filter(v => {
        if (this.variantFilter === 'active') return v.status === 'active';
        if (this.variantFilter === 'pending') return v.status === 'pending';
        if (this.variantFilter === 'discarded') return v.status === 'discarded';
        return true;
      });
    }
  }

  saveSetup(): void {
    if (this.setupForm.invalid || !this.point) return;

    const status = this.setupForm.get('status')?.value ? 'Active' : 'Paused';
    
    this.store.updatePoint(this.pointId, {
      name: this.setupForm.get('name')?.value,
      elementType: this.setupForm.get('elementType')?.value,
      selector: this.setupForm.get('selector')?.value,
      deviceScope: this.setupForm.get('deviceScope')?.value,
      status: status,
      updatedAt: new Date()
    });

    this.toast.showSuccess('Point setup saved');
  }

  saveBrief(): void {
    if (!this.point) return;

    const generationRules = {
      goodIdeas: this.goodIdeas,
      thingsToAvoid: this.thingsToAvoid,
      mustIncludeKeywords: this.mustIncludeKeywords,
      mustAvoidTerms: this.mustAvoidTerms,
      minChars: this.briefForm.get('minChars')?.value || 0,
      maxChars: this.briefForm.get('maxChars')?.value || 0,
      maxWords: this.briefForm.get('maxWords')?.value || 0
    };

    this.store.updatePoint(this.pointId, {
      objective: this.briefForm.get('objective')?.value,
      generationRules: JSON.stringify(generationRules),
      updatedAt: new Date()
    });

    this.toast.showSuccess('Optimization brief saved');
  }

  generateVariants(): void {
    if (!this.pointId) return;

    this.store.generateVariants(this.pointId, 10);
    this.toast.showSuccess('Generating 10 variants...');
  }

  approveVariant(variantId: string): void {
    this.store.approveVariant(variantId);
    this.toast.showSuccess('Variant approved');
  }

  unapproveVariant(variantId: string): void {
    this.store.updateVariant(variantId, { status: 'pending' });
    this.toast.showSuccess('Variant disabled');
  }

  deleteVariant(variantId: string): void {
    if (!confirm('Are you sure you want to delete this variant?')) return;
    
    this.store.deleteVariant(variantId);
    this.toast.showSuccess('Variant deleted');
  }

  updateVariant(variant: Variant): void {
    if (variant.status === 'active') return;
    
    this.store.updateVariant(variant.id, { text: variant.text });
  }

  toggleStatus(): void {
    if (!this.point) return;

    const newStatus = this.point.status === 'Active' ? 'Paused' : 'Active';
    this.store.updatePoint(this.pointId, {
      status: newStatus,
      updatedAt: new Date()
    });
    this.toast.showSuccess(`Point ${newStatus === 'Active' ? 'activated' : 'paused'}`);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Unknown';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId, 'points']);
  }
}
