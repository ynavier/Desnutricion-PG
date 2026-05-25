import { useState, useEffect } from 'react'

export default function AnimatedCounter({ value, duration = 800 }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTimestamp = null
    const end = parseInt(value) || 0
    if (end === 0) {
      setCount(0)
      return
    }

    let animationFrameId
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step)
      }
    }
    animationFrameId = window.requestAnimationFrame(step)
    
    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [value, duration])

  return <span>{count.toLocaleString('es-CO')}</span>
}
