import { defineRouting } from "next-intl/routing";

// Las 4 lenguas cooficiales del Estado español. El castellano es el idioma
// por defecto; catalán, euskera y gallego están disponibles con el mismo
// nivel de prioridad en el selector de idioma, siempre visible.
export const routing = defineRouting({
  locales: ["es", "ca", "eu", "gl"],
  defaultLocale: "es",
  localePrefix: "always"
});

export type Locale = (typeof routing.locales)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  es: "Castellano",
  ca: "Català",
  eu: "Euskara",
  gl: "Galego"
};
