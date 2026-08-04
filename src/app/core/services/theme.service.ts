import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly isDarkTheme = signal<boolean>(true);

  toggleTheme(): void {
    this.isDarkTheme.update(val => !val);
  }
}
