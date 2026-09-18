import { APP_BASE_HREF, Location, PlatformLocation } from '@angular/common';
import { MockPlatformLocation } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent skip link', () => {
  let events: Subject<NavigationEnd>;

  beforeEach(() => {
    events = new Subject<NavigationEnd>();
  });

  function createLayout(baseHref: string, initialPath: string): MainLayoutComponent {
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformLocation, useClass: MockPlatformLocation },
        { provide: APP_BASE_HREF, useValue: baseHref },
        { provide: Router, useValue: { events } },
      ],
    });
    TestBed.inject(PlatformLocation).replaceState(null, '', initialPath);
    return TestBed.runInInjectionContext(() => new MainLayoutComponent());
  }

  it('stays on the initial route and query while excluding a private fragment under a root document base', () => {
    const fragment = `order=ORD-100&token=${'a'.repeat(64)}`;
    const component = createLayout('/', `/track?source=saved#${fragment}`);
    const destination = new URL(component.contentLink(), 'https://store.example/');

    expect(TestBed.inject(PlatformLocation).hash).toBe(`#${fragment}`);
    expect(destination.pathname).toBe('/track');
    expect(destination.search).toBe('?source=saved');
    expect(destination.hash).toBe('#main-content');
    expect(component.contentLink()).not.toContain(fragment);
  });

  it('follows completed client navigation and respects the deployment base path', () => {
    const component = createLayout('/store/', '/store/products');
    expect(component.contentLink()).toBe('/store/products#main-content');

    TestBed.inject(Location).go('/products/phone-stand', 'view=details');
    events.next(
      new NavigationEnd(1, '/products/phone-stand', '/products/phone-stand?view=details'),
    );

    expect(component.contentLink()).toBe('/store/products/phone-stand?view=details#main-content');
  });
});
