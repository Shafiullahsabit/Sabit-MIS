export const defaultLocale = "en";

export const localeConfig = {
  en: {
    label: "English",
    language: "en",
    numberLocale: "en-AF",
    direction: "ltr",
  },
  ps: {
    label: "پښتو",
    language: "ps-AF",
    numberLocale: "ps-AF",
    direction: "rtl",
  },
  fa: {
    label: "دری",
    language: "fa-AF",
    numberLocale: "fa-AF",
    direction: "rtl",
  },
};

export const supportedLocales = Object.keys(localeConfig);
