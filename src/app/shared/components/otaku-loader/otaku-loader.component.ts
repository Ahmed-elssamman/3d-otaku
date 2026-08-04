import { Component, input } from '@angular/core';

@Component({
  selector: 'app-otaku-loader',
  standalone: true,
  templateUrl: './otaku-loader.component.html',
  styleUrl: './otaku-loader.component.scss'
})
export class OtakuLoaderComponent {
  readonly text = input<string>('Loading 3D Otaku...');
}
