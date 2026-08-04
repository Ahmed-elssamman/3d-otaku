import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HERO_STATS, HeroStat } from './anime-hero.control';
import { GlowButtonComponent } from '../glow-button/glow-button.component';

@Component({
  selector: 'app-anime-hero',
  standalone: true,
  imports: [RouterLink, GlowButtonComponent],
  templateUrl: './anime-hero.component.html',
  styleUrl: './anime-hero.component.scss'
})
export class AnimeHeroComponent {
  readonly stats: HeroStat[] = HERO_STATS;
}
