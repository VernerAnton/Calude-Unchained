import { useEffect, useState } from "react";

type ThemePreference = "system" | "light" | "dark";

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    return (localStorage.getItem("themePreference") as ThemePreference) || "system";
  });

  const [actualTheme, setActualTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const applyTheme = (pref: ThemePreference) => {
      const isSystemDark = mediaQuery.matches;
      let finalTheme: "light" | "dark";

      if (pref === "system") {
        finalTheme = isSystemDark ? "dark" : "light";
      } else {
        finalTheme = pref;
      }

      setActualTheme(finalTheme);
      
      if (finalTheme === "dark") {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");
      }
    };

    applyTheme(preference);

    const handleChange = () => {
      if (preference === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [preference]);

  const cycleTheme = () => {
    let next: ThemePreference;

    if (preference === "system") {
      next = "light";
    } else if (preference === "light") {
      next = "dark";
    } else {
      next = "system";
    }

    setPreference(next);
    localStorage.setItem("themePreference", next);
  };

  const getIcon = () => {
    if (preference === "system") {
      return "🌓";
    } else if (actualTheme === "dark") {
      return "☀️";
    } else {
      return "🌙";
    }
  };

  const getTitle = () => {
    if (preference === "system") {
      return `Auto (${actualTheme})`;
    } else if (actualTheme === "dark") {
      return "Switch to system";
    } else {
      return "Switch to dark";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="hidden sm:inline text-sm font-bold tracking-[0.1em]">[ MODE ]</span>
      <button
        onClick={cycleTheme}
        className="bg-transparent border-0 text-2xl cursor-pointer p-1 transition-transform hover:scale-110 min-w-[40px] min-h-[40px] flex items-center justify-center"
        aria-label="Toggle theme"
        title={getTitle()}
        data-testid="button-theme-toggle"
      >
        {getIcon()}
      </button>
    </div>
  );
}
