import { writable } from "svelte/store";
import {
  baseLocale,
  getLocale,
  getTextDirection,
  isLocale,
  locales,
  setLocale,
  type Locale,
} from "../paraglide/runtime.js";
import { m } from "../paraglide/messages.js";

const STORAGE_KEY = "fidoapp.locale";

export const availableLocales = locales;
export const currentLocale = writable<Locale>(initialLocale());

export function localeLabel(locale: Locale) {
  return locale === "ru" ? m.locale_ru() : m.locale_en();
}

export function setAppLocale(locale: string) {
  const next = isLocale(locale) ? locale : baseLocale;
  setLocale(next, { reload: false });
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Persisting the locale is best-effort in embedded webviews.
  }
  applyDocumentLocale(next);
  currentLocale.set(next);
}

export function initLocale() {
  setAppLocale(initialLocale());
}

function initialLocale(): Locale {
  const persisted = readPersistedLocale();
  if (persisted) return persisted;

  const runtimeLocale = getLocale();
  if (isLocale(runtimeLocale)) return runtimeLocale;

  const language = navigator.languages?.find(isLocale) || navigator.language;
  return isLocale(language) ? language : baseLocale;
}

function readPersistedLocale(): Locale | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

function applyDocumentLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = getTextDirection(locale);
}
