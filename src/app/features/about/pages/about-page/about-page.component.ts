import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '@core/services/seo.service';
import { SERVICE_PRINCIPLES, WORKFLOW_STEPS } from '../../about.control';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss'
})
export class AboutPageComponent implements OnInit {
  private seoService = inject(SeoService);
  workflowSteps = WORKFLOW_STEPS;
  servicePrinciples = SERVICE_PRINCIPLES;

  ngOnInit(): void {
    this.seoService.setTitle('About 3D Otaku');
    this.seoService.setMetaDescription('Learn how 3D Otaku reviews product requirements, confirms made-to-order production, and handles custom design feasibility requests.');
  }
}
