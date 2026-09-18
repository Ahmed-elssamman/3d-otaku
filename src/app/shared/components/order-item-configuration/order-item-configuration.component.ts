import { Component, computed, input } from '@angular/core';
import { ProductConfiguration } from '@core/models/product-configuration.model';
import { configurationDisplayRows } from '@core/utils/product-configuration-display.util';
import { CONFIGURATION_DISPLAY_TEXT } from '@core/utils/product-configuration-display.data';

@Component({
  selector: 'app-order-item-configuration',
  standalone: true,
  templateUrl: './order-item-configuration.component.html',
  styleUrl: './order-item-configuration.component.scss',
})
export class OrderItemConfigurationComponent {
  configuration = input.required<ProductConfiguration | null>();
  title = input(CONFIGURATION_DISPLAY_TEXT.title);
  missingText = input(CONFIGURATION_DISPLAY_TEXT.legacy);
  text = CONFIGURATION_DISPLAY_TEXT;
  rows = computed(() =>
    configurationDisplayRows(this.configuration()).filter((row) => row.value !== this.text.missing),
  );
}
