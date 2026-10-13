import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { BrandMark } from '../../components/brand/brand-mark';
import { Icon } from '../../components/icon/icon';
import { Reveal } from '../../components/reveal/reveal.directive';
import { API_URL } from '../../core/config/api.config';
import { SeoService } from '../../core/services/seo.service';
import { SiteSettings } from '../../core/types/settings.model';
import { EmphasisPipe } from '../../core/utils/emphasis.pipe';
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
  imports: [RouterLink, DecimalPipe, BrandMark, Icon, Reveal, EmphasisPipe],
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
  /** Un color por pilar (entrenamiento, nutrición, seguimiento): le da variedad a la página sin salir de la marca. */
  protected readonly hues = ['mint', 'amber', 'cyan'] as const;
  private readonly reel = viewChild<ElementRef<HTMLVideoElement>>('reel');
  protected readonly serviceIcons = ['dumbbell', 'apple', 'chart', 'heart', 'clipboard', 'drop'] as const;
  /** El titular entra palabra por palabra. */
  protected readonly titleWords = computed(() => this.site().hero.title.split(/\s+/).filter(Boolean));
  /** El video arranca en silencio (los navegadores no permiten otra cosa); la música es opcional. */
  protected readonly muted = signal(true);
  protected readonly scrolled = signal(false);
  /** Pantalla angosta: el video de la portada usa su versión vertical. */
  protected readonly phone = signal(false);
  private readonly cursor = viewChild<ElementRef<HTMLElement>>('cursor');

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
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const onScroll = () => this.scrolled.set(window.scrollY > 12);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
      this.trackCursor(destroyRef);
// En teléfono se reproduce la versión vertical del video; si la ventana cambia de tamaño, se cambia de archivo.
      const narrow = window.matchMedia('(max-width: 760px)');
      const pickVideo = () => {
        this.phone.set(narrow.matches);
        const video = this.reel()?.nativeElement;
        const src = `/media/flujo-programa${narrow.matches ? '-vertical' : ''}.mp4`;
        if (!video || video.getAttribute('src') === src) return;
        video.src = src;
        video.muted = this.muted();
        void video.play().catch(() => undefined);
      };
      pickVideo();
      narrow.addEventListener('change', pickVideo);
      destroyRef.onDestroy(() => narrow.removeEventListener('change', pickVideo));
    });

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

  /**
   * Destello del cursor: un halo suave que lo sigue con retraso y una chispa que va casi pegada.
   * Solo con ratón; se mueve con transform fuera del ciclo de Angular.
   */
  private trackCursor(destroyRef: DestroyRef): void {
    const el = this.cursor()?.nativeElement;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const halo = el.querySelector<HTMLElement>('.cursor__halo')!;
    const spark = el.querySelector<HTMLElement>('.cursor__spark')!;
    const pointer = el.querySelector<HTMLElement>('.cursor__pointer')!;
    // Con el cursor propio activo se oculta el del sistema en toda la landing.
    document.documentElement.classList.add('has-brand-cursor');
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const haloAt = { ...target };
    const sparkAt = { ...target };
    let frame = 0;
    let speed = 0;

    const tick = () => {
      haloAt.x += (target.x - haloAt.x) * 0.1;
      haloAt.y += (target.y - haloAt.y) * 0.1;
      const dx = target.x - sparkAt.x;
      const dy = target.y - sparkAt.y;
      sparkAt.x += dx * 0.32;
      sparkAt.y += dy * 0.32;
      // Cuanto más rápido va el cursor, más se estira y brilla la chispa.
      speed += (Math.min(Math.hypot(dx, dy) / 60, 1) - speed) * 0.2;
      halo.style.transform = `translate3d(${haloAt.x}px, ${haloAt.y}px, 0)`;
      spark.style.transform = `translate3d(${sparkAt.x}px, ${sparkAt.y}px, 0) rotate(${Math.atan2(dy, dx)}rad) scale(${1 + speed * 2.2}, ${1 - speed * 0.35})`;
      spark.style.opacity = String(0.55 + speed * 0.45);
      const settled = Math.abs(target.x - haloAt.x) < 0.3 && Math.abs(target.y - haloAt.y) < 0.3 && speed < 0.01;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      target.x = event.clientX;
      target.y = event.clientY;
      // El puntero va pegado al ratón, sin retraso: es con lo que se apunta.
      pointer.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      el.classList.add('is-on');
      // Sobre algo que se puede pulsar, el halo crece.
      el.classList.toggle('is-over', Boolean((event.target as Element | null)?.closest?.('a, button, [role=button], summary, label')));
      // Sobre campos de texto vuelve el cursor normal para poder escribir y seleccionar.
      el.classList.toggle('is-text', Boolean((event.target as Element | null)?.closest?.('input, textarea, select')));
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onLeave = () => el.classList.remove('is-on');
    const onDown = () => {
      el.classList.remove('is-click');
      void el.offsetWidth;
      el.classList.add('is-click');
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    destroyRef.onDestroy(() => {
      document.documentElement.classList.remove('has-brand-cursor');
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    });
  }

  protected toggleSound(video: HTMLVideoElement): void {
    video.muted = !video.muted;
    this.muted.set(video.muted);
    if (!video.muted) void video.play();
  }

  /** Luz que sigue al puntero dentro de cada tarjeta de servicio. */
  protected spot(event: PointerEvent): void {
    const cell = event.currentTarget as HTMLElement;
    const box = cell.getBoundingClientRect();
    cell.style.setProperty('--mx', `px`);
    cell.style.setProperty('--my', `px`);
  }
}
