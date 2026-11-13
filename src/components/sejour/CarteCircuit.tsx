// Carte du circuit, dessinée en SVG à partir des coordonnées GPS des étapes (src/data/carte.ts) :
// aucune carte téléchargée, aucun service externe. Deux vues : l'ensemble du trajet depuis Rennes,
// et un zoom sur la presqu'île de Crozon et la mer d'Iroise, où se concentrent les étapes.
import { useId } from 'react'
import { JOURS_PAR_LIEU, LIEUX, MERS, TRACE_PRESQU_ILE, type Lieu } from '../../data/carte'
import type { JourProgramme } from '../../domain/types'

/** Projection simple (équirectangulaire), suffisante à cette échelle : 1° de longitude ≈ cos(48°) × 1° de latitude. */
const COS_LAT = Math.cos((48.2 * Math.PI) / 180)

interface Cadre {
  largeur: number
  lonMin: number
  lonMax: number
  latMax: number
  latMin: number
}

function projeter(cadre: Cadre) {
  const echelle = cadre.largeur / ((cadre.lonMax - cadre.lonMin) * COS_LAT)
  return {
    hauteur: Math.round((cadre.latMax - cadre.latMin) * echelle),
    /** Pixels pour 1 km (1° de latitude ≈ 111 km). */
    pixelsParKm: echelle / 111,
    xy: (lat: number, lon: number) => ({
      x: Math.round((lon - cadre.lonMin) * COS_LAT * echelle),
      y: Math.round((cadre.latMax - lat) * echelle),
    }),
  }
}

const DECALAGES: Record<Lieu['etiquette'], { dx: number; dy: number; ancre: 'start' | 'end' | 'middle' }> = {
  droite: { dx: 12, dy: 6, ancre: 'start' },
  gauche: { dx: -12, dy: 6, ancre: 'end' },
  haut: { dx: 0, dy: -14, ancre: 'middle' },
  bas: { dx: 0, dy: 26, ancre: 'middle' },
}

function Point({ lieu, x, y, jours }: { lieu: Lieu; x: number; y: number; jours?: string }) {
  const d = DECALAGES[lieu.etiquette]
  const etape = lieu.type === 'etape'
  return (
    <g className={etape ? 'carte-etape' : 'carte-repere'}>
      <circle cx={x} cy={y} r={etape ? 7 : 5} />
      <text x={x + d.dx} y={y + d.dy} textAnchor={d.ancre}>
        {lieu.nom}
        {jours && <tspan className="carte-jours"> {jours}</tspan>}
      </text>
    </g>
  )
}

function EchelleKm({ km, pixelsParKm, x, y }: { km: number; pixelsParKm: number; x: number; y: number }) {
  const l = Math.round(km * pixelsParKm)
  return (
    <g className="carte-echelle" aria-hidden="true">
      <path d={`M${x} ${y - 6} V${y} H${x + l} V${y - 6}`} />
      <text x={x + l / 2} y={y - 10} textAnchor="middle">{km} km</text>
    </g>
  )
}

export default function CarteCircuit({ programme }: { programme: JourProgramme[] }) {
  const id = useId()
  const totalKm = programme.reduce((t, j) => t + (j.route?.distanceKm ?? 0), 0)

  // Vue d'ensemble : de la pointe Saint-Mathieu à Rennes.
  const ensemble = projeter({ largeur: 520, lonMin: -4.95, lonMax: -1.45, latMax: 48.55, latMin: 47.88 })
  const presquIle = ensemble.xy(48.25, -4.6)
  const rennes = ensemble.xy(LIEUX.rennes.lat, LIEUX.rennes.lon)

  // Zoom : presqu'île de Crozon et mer d'Iroise.
  const zoom = projeter({ largeur: 520, lonMin: -4.85, lonMax: -4.1, latMax: 48.43, latMin: 48.12 })
  const trace = TRACE_PRESQU_ILE.map((cle) => zoom.xy(LIEUX[cle].lat, LIEUX[cle].lon))
  const lieuxZoom = Object.values(LIEUX).filter((l) => l.id !== 'rennes')

  return (
    <figure className="carte-circuit">
      <div className="carte-vues">
        <svg viewBox={`0 0 520 ${ensemble.hauteur}`} role="img" aria-labelledby={`${id}-t1 ${id}-d1`}>
          <title id={`${id}-t1`}>Vue d'ensemble du trajet</title>
          <desc id={`${id}-d1`}>
            Départ de Rennes, à l'est, vers la presqu'île de Crozon, à la pointe ouest de la Bretagne, puis retour à Rennes.
          </desc>
          <text className="carte-mer" x={16} y={ensemble.hauteur - 12}>Océan Atlantique</text>
          {/* Aller (jour 1) au-dessus, retour (jour 5) en pointillés au-dessous. */}
          <path className="carte-trace" d={`M${rennes.x} ${rennes.y} Q${(rennes.x + presquIle.x) / 2} ${presquIle.y - 40} ${presquIle.x} ${presquIle.y}`} />
          <path className="carte-trace carte-trace-retour" d={`M${presquIle.x} ${presquIle.y} Q${(rennes.x + presquIle.x) / 2} ${rennes.y + 36} ${rennes.x} ${rennes.y}`} />
          <text className="carte-legende-trace" x={(rennes.x + presquIle.x) / 2} y={presquIle.y - 26} textAnchor="middle">J1 · aller (≈ 235 km)</text>
          <text className="carte-legende-trace" x={(rennes.x + presquIle.x) / 2} y={rennes.y + 30} textAnchor="middle">J5 · retour</text>
          <rect className="carte-zone" x={presquIle.x - 30} y={presquIle.y - 24} width={64} height={46} rx={8} />
          <text className="carte-legende-zone" x={presquIle.x - 30} y={presquIle.y - 32}>Presqu'île de Crozon</text>
          <g className="carte-etape">
            <circle cx={rennes.x} cy={rennes.y} r={7} />
            <text x={rennes.x - 4} y={rennes.y - 14} textAnchor="end">
              Rennes<tspan className="carte-jours"> {JOURS_PAR_LIEU.rennes}</tspan>
            </text>
          </g>
          <EchelleKm km={50} pixelsParKm={ensemble.pixelsParKm} x={400} y={ensemble.hauteur - 12} />
        </svg>

        <svg viewBox={`0 0 520 ${zoom.hauteur}`} role="img" aria-labelledby={`${id}-t2 ${id}-d2`}>
          <title id={`${id}-t2`}>Les étapes sur la presqu'île de Crozon et en mer d'Iroise</title>
          <desc id={`${id}-d2`}>
            Jours 1 à 3 autour de Crozon et Morgat : Camaret-sur-Mer et la pointe de Pen-Hir, puis le cap de la Chèvre.
            Jour 4 : contournement de la rade de Brest par Le Faou et Brest jusqu'à la pointe Saint-Mathieu.
          </desc>
          {MERS.map((m) => {
            const p = zoom.xy(m.lat, m.lon)
            return <text key={m.nom} className="carte-mer" x={p.x} y={p.y} textAnchor="middle">{m.nom}</text>
          })}
          <polyline className="carte-trace" points={trace.map((p) => `${p.x},${p.y}`).join(' ')} />
          {lieuxZoom.map((l) => {
            const p = zoom.xy(l.lat, l.lon)
            return <Point key={l.id} lieu={l} x={p.x} y={p.y} jours={JOURS_PAR_LIEU[l.id]} />
          })}
          <EchelleKm km={10} pixelsParKm={zoom.pixelsParKm} x={420} y={zoom.hauteur - 14} />
          <text className="carte-nord" x={500} y={30} textAnchor="middle" aria-hidden="true">N ↑</text>
        </svg>
      </div>
      <figcaption>
        Environ <strong>{totalKm} km</strong> de route sur cinq jours. Carte schématique : les étapes sont placées
        à leur position réelle, mais le tracé les relie en ligne droite et ne suit pas les routes.
      </figcaption>
    </figure>
  )
}
