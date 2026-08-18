import { Component, input } from '@angular/core';
import { ProductModelType } from '@core/enums/product-model-type.enum';
import { Product3dViewerComponent } from '@shared/components/product-3d-viewer/product-3d-viewer.component';

@Component({
  selector: 'app-admin-file-preview',
  standalone: true,
  imports: [Product3dViewerComponent],
  templateUrl: './admin-file-preview.component.html',
  styleUrl: './admin-file-preview.component.scss'
})
export class AdminFilePreviewComponent {
  imageUrl = input<string | null>(null);
  modelUrl = input<string | null>(null);
  modelType = input<ProductModelType>(ProductModelType.GLB);
  posterImage = input<string | null>(null);
  productName = input<string>('Preview');
}
