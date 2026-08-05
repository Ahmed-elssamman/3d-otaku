import { Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';

@Component({
  selector: 'app-admin-file-preview',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './admin-file-preview.component.html',
  styleUrl: './admin-file-preview.component.scss'
})
export class AdminFilePreviewComponent {
  imageUrl = input<string | null>(null);
  modelUrl = input<string | null>(null);
  posterImage = input<string | null>(null);
  productName = input<string>('Preview');
}
