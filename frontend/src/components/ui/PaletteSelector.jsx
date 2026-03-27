import React, { useState, useEffect } from 'react'

const PALETTES = [
  { id: 'white',   name: 'Белая',    icon: '⚪', desc: 'Светлая классика' },
  { id: 'black',   name: 'Чёрная',   icon: '⚫', desc: 'Глубокий чёрный' },
  { id: 'gray',    name: 'Серая',    icon: '🩶', desc: 'Нейтральная серая' },
  { id: 'beige',   name: 'Бежевая',  icon: '🤎', desc: 'Тёплый бежевый' },
  { id: 'beeline', name: 'Билайн',   icon: '🐝', desc: 'Чёрный & жёлтый' },
]

export { PALETTES }

const DARK_PALETTES = new Set(['black', 'beeline'])

export function applyPalette(paletteId) {
  const theme = DARK_PALETTES.has(paletteId) ? 'dark' : 'light'
  document.documentElement.setAttribute('data-palette', paletteId)
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('palette', paletteId)
  localStorage.setItem('theme', theme)
  window.dispatchEvent(new CustomEvent('paletteChanged', { detail: { palette: paletteId } }))
}

/** Inline grid of palette cards — use in settings/profile pages */
export function PaletteGrid() {
  const [currentPalette, setCurrentPalette] = useState('white')

  useEffect(() => {
    const saved = localStorage.getItem('palette') || 'white'
    setCurrentPalette(saved)
    applyPalette(saved)
  }, [])

  const handleSelect = (id) => {
    applyPalette(id)
    setCurrentPalette(id)
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {PALETTES.map((palette) => {
        const isActive = currentPalette === palette.id
        return (
          <button
            key={palette.id}
            onClick={() => handleSelect(palette.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left ${
              isActive
                ? 'ring-2 ring-indigo-500/70 glass-card shadow-lg'
                : 'glass-card hover:opacity-80'
            }`}
          >
            <span className="text-2xl shrink-0">{palette.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold glass-title leading-tight">{palette.name}</p>
              <p className="text-xs glass-subtitle opacity-50 leading-tight truncate">{palette.desc}</p>
            </div>
            {isActive && (
              <span className="ml-auto shrink-0 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function PaletteSelector() {
  return null
}

