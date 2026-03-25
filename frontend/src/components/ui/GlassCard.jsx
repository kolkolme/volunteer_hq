const GlassCard = ({ children, className = '' }) => {
  return (
    <div className={`glass-card p-6 animated-in ${className}`}>
      {children}
    </div>
  )
}

export default GlassCard
