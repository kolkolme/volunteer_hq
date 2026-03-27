const GlassCard = ({ children, className = '' }) => {
  return (
    <div className={`glass-card p-6 ${className}`}>
      {children}
    </div>
  )
}

export default GlassCard
