import { get, readonly, writable } from "svelte/store";

import { ApplicationConfig } from "../../bindings/telesma/appconfig";
import { m } from "../paraglide/messages.js";
import {
  baseLocale,
  getLocale,
  getTextDirection,
  isLocale,
  locales,
  setLocale,
  type Locale,
} from "../paraglide/runtime.js";
import { api } from "$lib/api.js";

const currentLocaleState = writable<Locale>(initialLocale());

const advancedModeState = writable(false);

let saveTail: Promise<void> = Promise.resolve();

export const availableLocales = locales;

export const currentLocale = readonly(currentLocaleState);

export const advancedMode = readonly(advancedModeState);

export function localeLabel(locale: Locale) {
  return locale === "ru" ? m.locale_ru() : m.locale_en();
}

export async function initializeApplicationConfig() {
  const fallbackLocale = initialLocale();

  try {
    const snapshot = await api.loadApplicationConfig();

    if (snapshot.exists) {
      applyLocale(snapshot.config.locale as Locale);
      advancedModeState.set(snapshot.config.advancedMode);

      return;
    }

    applyLocale(fallbackLocale);
    advancedModeState.set(false);
    await queueConfigSave();
  } catch {
    applyLocale(fallbackLocale);
    advancedModeState.set(false);
  }
}

export function setAppLocale(locale: string) {
  const next = isLocale(locale) ? locale : baseLocale;

  if (get(currentLocaleState) === next) return;

  applyLocale(next);
  void queueConfigSave().catch(() => {});
}

export function setAdvancedMode(enabled: boolean) {
  if (get(advancedModeState) === enabled) return;

  advancedModeState.set(enabled);
  void queueConfigSave().catch(() => {});
}

function initialLocale(): Locale {
  const runtimeLocale = getLocale();

  if (isLocale(runtimeLocale)) return runtimeLocale;

  const language = navigator.languages?.find(isLocale) || navigator.language;

  return isLocale(language) ? language : baseLocale;
}

function applyLocale(locale: Locale) {
  setLocale(locale, { reload: false });
  document.documentElement.lang = locale;
  document.documentElement.dir = getTextDirection(locale);
  currentLocaleState.set(locale);
}

function queueConfigSave() {
  const config = new ApplicationConfig({
    locale: get(currentLocaleState),
    advancedMode: get(advancedModeState),
  });
  const save = saveTail.then(() => api.saveApplicationConfig(config));

  saveTail = save.catch(() => {});

  return save;
}
