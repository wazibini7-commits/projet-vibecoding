import { MARQUE } from '../../data/marque'
import { TOUS_LES_MEDIAS, VIDEO_TAS_DE_POIS } from '../../data/medias'
import { MENTION_DEMO } from '../../data/sejour'

/** Pied de page : marque, rappel du statut de démonstration, crédits des photographies (obligatoires). */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="conteneur footer-grille">
        <div>
          <p className="footer-marque">{MARQUE.nom}</p>
          <p className="footer-signature">{MARQUE.signature}</p>
          <p>{MARQUE.activite}.</p>
        </div>
        <div>
          <p className="footer-titre">Prototype</p>
          <p>{MENTION_DEMO}.</p>
          <p>Aucune donnée n'est enregistrée ni transmise. Utilisez des coordonnées fictives pendant les essais.</p>
        </div>
      </div>

      <div className="conteneur">
        <details className="credits">
          <summary>Crédits photographiques et vidéo</summary>
          <p>
            Photographies et vidéo issues de Wikimedia Commons, sous licence libre. Images redimensionnées et
            converties au format WebP ; vidéo réencodée en 480p.
          </p>
          <ul>
            {TOUS_LES_MEDIAS.map((m) => (
              <li key={m.id}>
                {m === VIDEO_TAS_DE_POIS.affiche ? 'Vidéo — ' : ''}{m.lieu} : {m.credit.auteur},{' '}
                <a href={m.credit.urlLicence} target="_blank" rel="noreferrer">{m.credit.licence}</a>,{' '}
                <a href={m.credit.source} target="_blank" rel="noreferrer">source<span className="sr-only"> (Wikimedia Commons, {m.lieu})</span></a>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </footer>
  )
}
