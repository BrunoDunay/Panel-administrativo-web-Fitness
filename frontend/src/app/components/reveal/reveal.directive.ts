import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

/** Forma de aparecer: sube (por defecto), solo se desvanece, entra desde un lado o se acerca apenas. */
export type RevealKind = '' | 'up' | 'fade' | 'left' | 'right' | 'zoom';

/**
 * Aparición sutil al hacer scroll.
 * Solo actúa en el navegador y solo sobre elementos fuera de la vista inicial,
 * así el contenido renderizado en SSR nunca parpadea ni queda oculto sin JavaScript.
 */
@Directive({ selector: '[appReveal]' })
export class Reveal {
  readonly appReveal = input<RevealKind>('');
  /** Retraso en ms para escalonar elementos de una misma fila. */
  readonly revealDelay = input(0);

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (el.getBoundingClientRect().top < window.innerHeight) return;

      // Con "reducir movimiento" del sistema no hay desplazamientos: solo un fundido suave.
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const kind = reduced ? 'fade' : this.appReveal() || 'up';
      el.classList.add('reveal', `reveal--${kind}`);
      el.style.transitionDelay = `${this.revealDelay()}ms`;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          el.classList.add('is-visible');
          observer.disconnect();
          // Al terminar se quita el retraso para que no afecte a los hovers del propio elemento.
          el.addEventListener('transitionend', () => (el.style.transitionDelay = ''), { once: true });
        },
        { rootMargin: '0px 0px -10% 0px' },
      );
      observer.observe(el);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
