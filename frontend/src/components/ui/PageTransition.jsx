import { useState, useEffect } from 'react'

const PageTransition = ({ children, activeKey }) => {
  const [phase, setPhase] = useState('enter')

  useEffect(() => {
    setPhase('out')
    const outTimer = setTimeout(() => setPhase('enter'), 420)
    return () => clearTimeout(outTimer)
  }, [activeKey])

  return <div className={`page-transition page-transition-${phase}`}>{children}</div>
}

export default PageTransition
