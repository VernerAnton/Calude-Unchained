import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Settings } from "@shared/schema";

interface SettingsContextType {
  settings: Settings | undefined;
  isLoading: boolean;
  isReady: boolean;
}

const defaultSettings: Partial<Settings> = {
  defaultModel: "claude-sonnet-4-5",
  theme: "system",
  autoTitle: true,
  fontSize: "medium",
};

const SettingsContext = createContext<SettingsContextType>({
  settings: undefined,
  isLoading: true,
  isReady: false,
});

export function useSettings() {
  return useContext(SettingsContext);
}

function applyTheme(theme: string) {
  const root = document.documentElement;
  const body = document.body;
  
  if (theme === "dark") {
    root.classList.add("dark");
    body.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
    body.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      root.classList.add("dark");
      body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      body.classList.remove("dark");
    }
  }
}

function applyFontSize(fontSize: string) {
  const root = document.documentElement;
  root.classList.remove("font-size-small", "font-size-medium", "font-size-large");
  root.classList.add(`font-size-${fontSize}`);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (isLoading) return;
    
    const theme = settings?.theme || defaultSettings.theme || "system";
    const fontSize = settings?.fontSize || defaultSettings.fontSize || "medium";
    
    applyTheme(theme);
    applyFontSize(fontSize);
    setIsReady(true);
  }, [settings, isLoading]);

  useEffect(() => {
    const theme = settings?.theme || defaultSettings.theme;
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      const body = document.body;
      if (e.matches) {
        root.classList.add("dark");
        body.classList.add("dark");
      } else {
        root.classList.remove("dark");
        body.classList.remove("dark");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings?.theme]);

  const effectiveSettings = settings || (defaultSettings as Settings);

  return (
    <SettingsContext.Provider value={{ settings: effectiveSettings, isLoading, isReady }}>
      {children}
    </SettingsContext.Provider>
  );
}
