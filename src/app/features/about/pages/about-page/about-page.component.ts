import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '@core/services/seo.service';
import { WORKFLOW_STEPS, WorkflowStep } from '../../about.control';
import { APP_CONSTANTS } from '@core/constants/app.constants';
import { SectionTitleComponent } from '@shared/components/section-title/section-title.component';
import { GlowButtonComponent } from '@shared/components/glow-button/glow-button.component';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink, SectionTitleComponent, GlowButtonComponent],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss'
})
export class AboutPageComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  readonly workflowSteps: WorkflowStep[] = WORKFLOW_STEPS;
  readonly safetyDisclaimer = APP_CONSTANTS.SAFETY_DISCLAIMER;

  ngOnInit(): void {
    this.seoService.setTitle('About 3D Otaku - Crafting Anime Props in 3D');
    this.seoService.setMetaDescription('Learn about 3D Otaku story, state-of-the-art PLA+ 3D printing process, and non-sharp cosplay prop safety standards.');
  }
}
