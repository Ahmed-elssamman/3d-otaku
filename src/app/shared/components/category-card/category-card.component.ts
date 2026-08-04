import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryItem } from '@core/models/category.model';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './category-card.component.html',
  styleUrl: './category-card.component.scss'
})
export class CategoryCardComponent {
  readonly category = input.required<CategoryItem>();
}
