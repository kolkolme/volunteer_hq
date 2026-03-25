const LoadingOverlay = ({ visible = false }) => {
  if (!visible) return null

  return (
    <div className="loading-overlay">
      <div className="loading-circle" />
      <div className="loading-text">Loading...</div>
    </div>
  )
}

export default LoadingOverlay
