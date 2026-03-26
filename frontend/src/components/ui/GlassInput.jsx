const GlassInput = ({ className = '', onChange, ...props }) => {
  return <input 
    className={`glass-input border rounded p-2 ${className}`} 
    onChange={onChange}
    {...props} 
  />
}

export default GlassInput
