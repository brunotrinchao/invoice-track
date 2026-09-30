export type Theme = 'dark' | 'light'

const isLight = ref(false)

export function useTheme() {
  function initTheme() {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || (!saved && window.matchMedia('(prefers-color-scheme: light)').matches)) {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  function setTheme(theme: Theme) {
    isLight.value = theme === 'light'
    if (typeof window === 'undefined') return
    localStorage.setItem('theme', theme)
    if (theme === 'light') {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    }
  }

  function toggleTheme() {
    setTheme(isLight.value ? 'dark' : 'light')
  }

  return { isLight, setTheme, toggleTheme, initTheme }
}
