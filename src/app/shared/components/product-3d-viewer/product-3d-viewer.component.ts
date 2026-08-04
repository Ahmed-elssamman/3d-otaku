import { Component, input, signal, ElementRef, viewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Product } from '@core/models/product.model';

@Component({
  selector: 'app-product-3d-viewer',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './product-3d-viewer.component.html',
  styleUrl: './product-3d-viewer.component.scss'
})
export class Product3dViewerComponent {
  readonly product = input.required<Product>();

  readonly modelViewerRef = viewChild<ElementRef<HTMLElement>>('viewer');
  readonly isAutoRotating = signal<boolean>(true);
  readonly isLoaded = signal<boolean>(false);

  toggleAutoRotate(): void {
    const el = this.modelViewerRef()?.nativeElement as any;
    if (el) {
      el.autoRotate = !el.autoRotate;
      this.isAutoRotating.set(el.autoRotate);
    }
  }

  resetCamera(): void {
    const el = this.modelViewerRef()?.nativeElement as any;
    if (el && typeof el.resetTurntableRotation === 'function') {
      el.resetTurntableRotation();
    }
  }

  onModelLoad(): void {
    this.isLoaded.set(true);
  }
}
