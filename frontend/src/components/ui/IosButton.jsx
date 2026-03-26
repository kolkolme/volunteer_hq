const IosButton = ({ className = '', disabled = false, children, ...props }) => {
  return (
    <button className={`btn-ios px-4 py-2 ${className}`} disabled={disabled} {...props}>
      {children}
    </button>
  )
}

export default IosButton




