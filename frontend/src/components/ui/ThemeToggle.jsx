import { Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'

const ThemeToggle = ({ theme, setTheme }) => {
  const [palette, setPalette] = useState('white')
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    const currentPalette = localStorage.getItem('palette') || 'white'
    setPalette(currentPalette)
    setIsHidden(currentPalette === 'black' || currentPalette === 'gray')

    // Listen for palette changes from PaletteSelector
    const handlePaletteChange = (event) => {
      const newPalette = event.detail.palette
      setPalette(newPalette)
      setIsHidden(newPalette === 'black' || newPalette === 'gray')
    }

    window.addEventListener('paletteChanged', handlePaletteChange)
    return () => window.removeEventListener('paletteChanged', handlePaletteChange)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)

    // Add transition class for animation
    const appShell = document.querySelector('.app-shell')
    if (appShell) {
      appShell.classList.add('theme-switching')
      setTimeout(() => appShell.classList.remove('theme-switching'), 500)
    }
  }

  // Не показывать кнопку на чёрной и серой палитре
  if (isHidden) {
    return null
  }

  return (
    <button
      onClick={toggleTheme}
      className="btn-ios p-3"
      aria-label="Toggle theme"
      type="button"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}

export default ThemeToggle
