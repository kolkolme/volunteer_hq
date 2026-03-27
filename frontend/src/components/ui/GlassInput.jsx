const GlassInput = ({ className = '', onChange, ...props }) => {
  return <input 
    className={`glass-input ${className}`} 
    onChange={onChange}
    {...props} 
  />
}

export default GlassInput
