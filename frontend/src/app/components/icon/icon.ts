import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Íconos de trazo (24×24). */
const ICONS = {
  instagram: 'M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zM12 16a4 4 0 100-8 4 4 0 000 8zM17.5 6.5h.01',
  facebook: 'M14 21v-7h3l.5-4H14V8a1 1 0 011-1h2.5V3.5H15A4.5 4.5 0 0010.5 8v2H7v4h3.5v7z',
  tiktok: 'M14 3v11.5a3.5 3.5 0 11-3.5-3.5M14 3c.3 2.6 2 4.4 5 4.7',
  whatsapp:
    'M20 11.6a8.4 8.4 0 01-12.4 7.3L3 20.3l1.4-4.4A8.4 8.4 0 1120 11.6zM8.8 8.3c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.2-.1.3 0 .5a6 6 0 002.8 2.5c.2.1.4.1.5-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5 0 .9-.7 1.8-1.7 1.9-1 .1-2.3-.3-4-1.5a9 9 0 01-2.9-3.5c-.5-1.1-.4-2.1.2-2.8z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowUpRight: 'M7 17L17 7M9 7h8v8',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  close: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  location: 'M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  home: 'M3 11.5l9-7.5 9 7.5M5.5 10v10h13V10',
  users: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20a6.5 6.5 0 0113 0M16 4.2a3.5 3.5 0 010 6.6M18 14.5a6.5 6.5 0 013.5 5.5',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  dumbbell: 'M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12',
  food: 'M6 3v7a2 2 0 004 0V3M8 3v18M17 21V3c-2.5 1-4 3.5-4 7 0 1.5 1.5 2.5 4 2.5',
  chart: 'M4 20V4M4 20h16M8 16l3.5-4 3 2.5L20 8',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  drop: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z',
  pill: 'M9.5 20.5a5 5 0 01-7-7l7-7a5 5 0 017 7zM6 10l7 7',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.2a4.3 4.3 0 017.5 2.6C19.5 15.4 12 20 12 20z',
  cart: 'M3 4h2.5l2 11h10.5l2-8H7M9 20h.01M17 20h.01',
  swap: 'M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4',
  clipboard: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h4',
  ruler: 'M3 16L16 3l5 5L8 21zM7.5 11.5l2 2M10.5 8.5l2 2M13.5 5.5l2 2',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5h.01',
} as const;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 24 24" [attr.width]="size()" [attr.height]="size()">
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host { display: inline-flex; flex: none; }
    svg { fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  protected readonly path = computed(() => ICONS[this.name()]);
}
