"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import en from "@/messages/en.json";
import fa from "@/messages/fa.json";
import ps from "@/messages/ps.json";
import { defaultLocale, localeConfig } from "@/lib/i18n/config";

const dictionaries = { en, ps, fa };
const localeStorageKey = "sabit-mis-locale";
const LocaleContext = createContext(null);
const localeListeners = new Set();

function subscribeToLocaleChanges(listener) {
  localeListeners.add(listener);

  const handleStorage = (event) => {
    if (event.key === localeStorageKey) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    localeListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getLocaleSnapshot() {
  const savedLocale = window.localStorage.getItem(localeStorageKey);

  return Object.prototype.hasOwnProperty.call(localeConfig, savedLocale)
    ? savedLocale
    : defaultLocale;
}

function getServerLocaleSnapshot() {
  return defaultLocale;
}

function getMessage(dictionary, key) {
  return key.split(".").reduce((value, part) => value?.[part], dictionary);
}

export function LocaleProvider({ children }) {
  const locale = useSyncExternalStore(
    subscribeToLocaleChanges,
    getLocaleSnapshot,
    getServerLocaleSnapshot,
  );

  useEffect(() => {
    const { language, direction } = localeConfig[locale];
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [locale]);

  const setLocale = useCallback((nextLocale) => {
    if (!Object.prototype.hasOwnProperty.call(localeConfig, nextLocale)) {
      throw new RangeError(`Unsupported locale: ${nextLocale}`);
    }

    window.localStorage.setItem(localeStorageKey, nextLocale);
    localeListeners.forEach((listener) => listener());
  }, []);

  const t = useCallback(
    (key) =>
      getMessage(dictionaries[locale], key) ??
      getMessage(dictionaries[defaultLocale], key) ??
      key,
    [locale],
  );

  const contextValue = useMemo(
    () => ({
      locale,
      numberLocale: localeConfig[locale].numberLocale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}
