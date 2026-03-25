import React, { useState, useEffect } from 'react'
import { Palette } from 'lucide-react'

const PALETTES = [
  { id: 'white', name: 'Белая', icon: '⚪' },
  { id: 'black', name: 'Чёрная', icon: '⚫' },
  { id: 'gray', name: 'Серая', icon: '⚫' },
  { id: 'beige', name: 'Бежевая', icon: '🟤' },
]

export default function PaletteSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPalette, setCurrentPalette] = useState('white')

  useEffect(() => {
    const saved = localStorage.getItem('palette') || 'white'
    setCurrentPalette(saved)
    applyPalette(saved)
  }, [])

  const applyPalette = (paletteId) => {
    document.documentElement.setAttribute('data-palette', paletteId)
    localStorage.setItem('palette', paletteId)
    setCurrentPalette(paletteId)
    setIsOpen(false)

    // Dispatch custom event for other components (like ThemeToggle) to listen
    window.dispatchEvent(new CustomEvent('paletteChanged', { detail: { palette: paletteId } }))
  }

  const currentPaletteData = PALETTES.find(p => p.id === currentPalette)

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-ios flex items-center gap-2 px-4 py-2 rounded-2xl"
        title="Выбрать цветовую палитру"
      >
        <Palette size={18} />
        <span className="text-sm font-medium hidden sm:inline">Палитра</span>
      </button>

      {/* Overlay - Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-9998 pointer-events-auto"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown Menu - Renders above overlay */}
      {isOpen && (
        <div className="fixed top-20 right-4 glass-panel rounded-3xl shadow-2xl p-3 z-9999 min-w-48 backdrop-blur-lg pointer-events-auto">
          <div className="space-y-2">
            {PALETTES.map((palette) => (
              <button
                key={palette.id}
                onClick={() => applyPalette(palette.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  currentPalette === palette.id
                    ? 'bg-glass-card border border-glow-primary shadow-md'
                    : 'hover:bg-glass-card hover:shadow-sm'
                }`}
              >
                <span className="text-lg">{palette.icon}</span>
                <span className="text-sm font-medium">{palette.name}</span>
                {currentPalette === palette.id && (
                  <span className="ml-auto text-xs font-semibold opacity-70">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
