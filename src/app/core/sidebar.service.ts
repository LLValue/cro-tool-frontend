import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private closeSidebarSubject = new Subject<void>();
  public closeSidebar$ = this.closeSidebarSubject.asObservable();

  closeSidebar(): void {
    this.closeSidebarSubject.next();
  }
}

