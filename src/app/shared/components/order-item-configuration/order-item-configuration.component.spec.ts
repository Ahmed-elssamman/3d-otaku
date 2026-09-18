import { TestBed } from '@angular/core/testing';
import { ProductConfigurationVersion } from '@core/enums/product-configuration-version.enum';
import { ProductConfiguration } from '@core/models/product-configuration.model';
import { OrderItemConfigurationComponent } from './order-item-configuration.component';

describe('stored configuration disclosure', () => {
  const configuration: ProductConfiguration = {
    version: ProductConfigurationVersion.Current,
    material: 'PLA',
    finish: 'Hand',
    color: 'أخضر',
    size: '20',
    weight: '',
    printTime: '',
    layerHeight: '',
    infill: '',
    isMadeToOrder: false,
    productionTimeMin: null,
    productionTimeMax: null,
    productionTimeUnit: null,
    safetyNote: '<b>ملاحظة محفوظة</b>',
  };

  it('shows a native disclosure of stored facts without interpreting content as HTML', () => {
    const fixture = TestBed.createComponent(OrderItemConfigurationComponent);
    fixture.componentRef.setInput('configuration', configuration);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('details > summary')?.textContent).toContain(
      'المواصفات المسجّلة مع الطلب',
    );
    expect(element.textContent).toContain('20 (الوحدة غير مذكورة)');
    expect(element.textContent).toContain('غير موضح');
    expect(element.textContent).toContain('<b>ملاحظة محفوظة</b>');
    expect(element.querySelector('b')).toBeNull();
    expect(element.textContent).not.toContain('يدوي');
  });

  it('distinguishes absent legacy order evidence from a pre-purchase cart disclosure', () => {
    const fixture = TestBed.createComponent(OrderItemConfigurationComponent);
    fixture.componentRef.setInput('configuration', null);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('dl')).toBeNull();
    expect(element.textContent).toContain('لا تتوفر مواصفات محفوظة قابلة للعرض لهذه القطعة');
    fixture.componentRef.setInput('title', 'مواصفات القطعة في السلة');
    fixture.componentRef.setInput('missingText', 'سنراجع المواصفات الحالية قبل تأكيد الطلب.');
    fixture.detectChanges();
    expect(element.querySelector('summary')?.textContent).toContain('مواصفات القطعة في السلة');
    expect(element.textContent).not.toContain('لا تتوفر مواصفات محفوظة قابلة للعرض لهذه القطعة');
  });
});
