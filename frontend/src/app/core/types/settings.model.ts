export interface TitledItem {
  title: string;
  description: string | null;
}

/** Contenido de la landing, editable desde el panel. */
export interface SiteSettings {
  brand: { name: string; coachName: string; tagline: string | null };
  hero: { eyebrow: string | null; title: string; subtitle: string | null; ctaLabel: string | null; isProvisional: boolean };
  services: { title: string; items: TitledItem[]; isProvisional: boolean };
  method: { title: string; intro: string | null; steps: TitledItem[]; isProvisional: boolean };
  about: { title: string; body: string | null; credentials: string[]; isProvisional: boolean };
  contact: {
    whatsapp: string | null;
    whatsappMessage: string | null;
    email: string | null;
    instagram: string | null;
    facebook: string | null;
    tiktok: string | null;
    city: string | null;
    isProvisional: boolean;
  };
}

export type SettingsSection = keyof SiteSettings;
