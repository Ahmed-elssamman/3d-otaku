import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-glow-button',
  standalone: true,
  templateUrl: './glow-button.component.html',
  styleUrl: './glow-button.component.scss'
})
export class GlowButtonComponent {
  readonly text = input.required<string>();
  readonly icon = input<string>('');
  readonly variant = input<'primary' | 'secondary' | 'accent'>('primary');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input<boolean>(false);

  readonly buttonClick = output<void>();

  onClick(): void {
    if (!this.disabled()) {
      this.buttonClick.emit();
    }
  }
}
