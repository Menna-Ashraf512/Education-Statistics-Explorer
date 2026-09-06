import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly isDark = signal(false);

  constructor() {
    const savedTheme = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('theme')
      : null;
    const prefersDark = isPlatformBrowser(this.platformId)
      && window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.setTheme(savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light');
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  private setTheme(theme: ThemeMode): void {
    this.isDark.set(theme === 'dark');
    this.document.documentElement.classList.toggle('dark', theme === 'dark');

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('theme', theme);
    }
  }
}
