const GlassInput = ({ className = '', onChange, ...props }) => {
  const handleChange = (e) => {
    console.log(`GlassInput changed:`, { name: props.name, value: e.target.value })
    if (onChange) {
      onChange(e)
    }
  }

  return <input 
    className={`glass-input border rounded p-2 ${className}`} 
    onChange={handleChange}
    {...props} 
  />
}

export default GlassInput
