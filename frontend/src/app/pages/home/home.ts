import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Btn } from '../../components/buttons/btn';
import { Icon } from '../../components/icon/icon';
import { Reveal } from '../../components/reveal/reveal.directive';
import { API_URL } from '../../core/config/api.config';
import { SeoService } from '../../core/services/seo.service';
import { SiteSettings } from '../../core/types/settings.model';
import { whatsappLink } from '../../core/utils/format';

/** Contenido de respaldo: la landing se ve completa aunque la API no responda. */
const FALLBACK: SiteSettings = {
  brand: { name: 'Fitness by Evidence', coachName: 'Germain Camarillo', tagline: 'Entrenamiento y nutrición basados en evidencia' },
  hero: {
    eyebrow: 'Coach de entrenamiento y nutrición',
    title: 'Tu plan, calculado para ti.',
    subtitle: 'Entrenamiento y alimentación diseñados a partir de tus condiciones, tu contexto y tu objetivo.',
    ctaLabel: 'Quiero mi plan',
    isProvisional: true,
  },
  services: { title: 'Qué incluye trabajar conmigo', items: [], isProvisional: true },
  method: { title: 'Método basado en evidencia', intro: null, steps: [], isProvisional: true },
  about: { title: 'Sobre Germain', body: null, credentials: [], isProvisional: true },
  contact: { whatsapp: null, whatsappMessage: null, email: null, instagram: null, facebook: null, tiktok: null, city: null, isProvisional: true },
};

/** Landing: qué ofrece el coach, cómo trabaja, quién es y cómo contactarlo. */
@Component({
  selector: 'app-home',
  imports: [RouterLink, Btn, Icon, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly loaded = toSignal(
    inject(HttpClient)
      .get<Partial<SiteSettings>>(`${inject(API_URL)}/settings`)
      .pipe(catchError(() => of({} as Partial<SiteSettings>))),
    { initialValue: {} as Partial<SiteSettings> },
  );
  protected readonly site = computed<SiteSettings>(() => ({ ...FALLBACK, ...this.loaded() }));
  protected readonly year = new Date().getFullYear();
  protected readonly serviceIcons = ['dumbbell', 'food', 'chart', 'heart', 'clipboard', 'drop'] as const;

  protected readonly whatsapp = computed(() => whatsappLink(this.site().contact.whatsapp, this.site().contact.whatsappMessage));
  protected readonly mailto = computed(() => (this.site().contact.email ? `mailto:${this.site().contact.email}` : null));
  /** A dónde lleva el botón principal: WhatsApp si hay número; si no, el correo o la sección de contacto. */
  protected readonly cta = computed(() => this.whatsapp() ?? this.mailto() ?? '#contacto');
  protected readonly ctaExternal = computed(() => this.cta().startsWith('http'));

  protected readonly socials = computed(() => {
    const { instagram, facebook, tiktok } = this.site().contact;
    const handle = (value: string) => value.replace(/^@/, '').trim();
    const url = (value: string, base: string) => (/^https?:\/\//.test(value) ? value : `${base}${handle(value)}`);
    return [
      instagram ? { icon: 'instagram' as const, label: `@${handle(instagram)}`, href: url(instagram, 'https://instagram.com/') } : null,
      facebook ? { icon: 'facebook' as const, label: facebook, href: url(facebook, 'https://facebook.com/') } : null,
      tiktok ? { icon: 'tiktok' as const, label: `@${handle(tiktok)}`, href: url(tiktok, 'https://tiktok.com/@') } : null,
    ].filter((item) => item !== null);
  });

  constructor() {
    inject(SeoService).setPage({
      title: 'Fitness by Evidence · Germain Camarillo | Entrenamiento y nutrición a tu medida',
      description: 'Planes de entrenamiento y alimentación basados en evidencia, diseñados según tus condiciones, características y objetivos por el coach Germain Camarillo.',
      path: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ProfessionalService',
        name: 'Fitness by Evidence',
        description: 'Planes de entrenamiento y alimentación personalizados, basados en evidencia.',
        founder: { '@type': 'Person', name: 'Germain Camarillo' },
      },
    });
  }
}
