import type { ReactNode } from 'react'

/** Pastille signalant un élément provisoire (« à confirmer »). */
export default function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>
}
