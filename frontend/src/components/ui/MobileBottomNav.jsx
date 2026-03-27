/**
 * Fixed bottom navigation bar — visible only on mobile (hidden on lg+).
 * Replaces the horizontal-scrolling tab bar for a native-app feel.
 */
const MobileBottomNav = ({ tabs, activeTab, onTabChange, color = 'blue' }) => {
  const activeText = color === 'amber' ? 'text-amber-500' : 'text-blue-500'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-panel border-t border-white/20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around items-stretch h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full px-1 transition-all duration-200 ${
                isActive ? activeText : 'glass-subtitle opacity-60'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                  isActive ? 'scale-110' : ''
                }`}
              />
              <span
                className={`text-[9px] leading-tight text-center truncate w-full max-w-[56px] ${
                  isActive ? 'font-semibold' : 'font-medium'
                }`}
              >
                {tab.short || tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileBottomNav
