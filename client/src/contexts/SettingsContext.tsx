import { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Settings } from "@shared/schema";

interface SettingsContextType {
  settings: Settings | undefined;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: undefined,
  isLoading: true,
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (!settings) return;

    const root = document.documentElement;
    
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else if (settings.theme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }

    root.classList.remove("font-size-small", "font-size-medium", "font-size-large");
    root.classList.add(`font-size-${settings.fontSize}`);
  }, [settings]);

  useEffect(() => {
    if (!settings || settings.theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}
