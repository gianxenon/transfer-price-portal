"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"

type ThemeContextValue = {
  theme: Theme
  setTheme: React.Dispatch<React.SetStateAction<Theme>>
  resolvedTheme: "light" | "dark"
  systemTheme: "light" | "dark"
  themes: Theme[]
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)
const STORAGE_KEY = "theme"
const THEMES: Theme[] = ["light", "dark", "system"]

function disableTransitions() {
  const style = document.createElement("style")
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none !important;}"
    )
  )
  document.head.appendChild(style)

  return () => {
    void document.body.offsetHeight
    document.head.removeChild(style)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system")
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">("light")

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored)
      }
    } catch {}
  }, [])

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const update = () => setSystemTheme(media.matches ? "dark" : "light")
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const resolvedTheme = theme === "system" ? systemTheme : theme

  React.useEffect(() => {
    const root = document.documentElement
    const cleanup = disableTransitions()
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
    root.style.colorScheme = resolvedTheme
    cleanup()
  }, [resolvedTheme])

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {}
  }, [theme])

  const value = React.useMemo(
    () => ({
      theme,
      setTheme: setThemeState,
      resolvedTheme,
      systemTheme,
      themes: THEMES,
    }),
    [theme, resolvedTheme, systemTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    return {
      theme: "system" as Theme,
      setTheme: () => {},
      resolvedTheme: "light" as const,
      systemTheme: "light" as const,
      themes: THEMES,
    }
  }
  return ctx
}
