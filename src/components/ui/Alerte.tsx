import type { ReactNode } from 'react'

interface AlerteProps {
  type: 'info' | 'erreur'
  children: ReactNode
}

/** Encadré d'information ou d'erreur, annoncé aux lecteurs d'écran. */
export default function Alerte({ type, children }: AlerteProps) {
  return (
    <div className={`alerte alerte-${type}`} role={type === 'erreur' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
