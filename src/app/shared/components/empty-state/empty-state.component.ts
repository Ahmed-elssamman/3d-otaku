import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  readonly title = input<string>('No Products Found');
  readonly message = input<string>('Try adjusting your search terms or filters to find what you are looking for.');
  readonly buttonText = input<string>('Reset Filters');

  readonly actionClick = output<void>();

  onReset(): void {
    this.actionClick.emit();
  }
}
