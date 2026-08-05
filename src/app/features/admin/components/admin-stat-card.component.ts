import { Component, input } from '@angular/core';

@Component({
  selector: 'app-admin-stat-card',
  standalone: true,
  templateUrl: './admin-stat-card.component.html',
  styleUrl: './admin-stat-card.component.scss'
})
export class AdminStatCardComponent {
  title = input.required<string>();
  value = input.required<string>();
  subtitle = input.required<string>();
  icon = input.required<string>();
  accentClass = input<string>('from-fuchsia-500/25 via-violet-500/10 to-cyan-400/20');
}
