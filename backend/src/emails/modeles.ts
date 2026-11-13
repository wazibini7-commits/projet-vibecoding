// Contenu des e-mails (fonctions pures : données → sujet, texte, HTML).
// Chaque e-mail existe en version texte ET en version HTML : les messageries qui n'affichent pas
// le HTML (ou les lecteurs d'écran) gardent un message complet et lisible.
// Toutes les valeurs saisies par un visiteur sont ÉCHAPPÉES dans le HTML (pas d'injection de code).
// Chaque e-mail destiné au client contient son lien personnel « Suivre ma demande ».
import type { DemandeReservation, StatutDemande } from '../../../src/domain/types'
import { MARQUE } from '../../../src/data/marque'
import { formaterDateFr } from '../../../src/utils/dates'
import { formaterDuree, formaterPrix } from '../../../src/utils/format'

export interface ContenuEmail {
  sujet: string
  texte: string
  html: string
}

/** Rend du texte sûr à insérer dans du HTML. */
export function echapperHtml(valeur: string): string {
  return valeur
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

type Ligne = [libelle: string, valeur: string]

function lignesDemande(d: DemandeReservation): Ligne[] {
  return [
    ['Référence', d.reference],
    ['Circuit', `${d.sejour.nom} — ${formaterDuree(d.sejour.jours, d.sejour.nuits)}`],
    ['Voyageurs', `${d.sejour.nombreVoyageurs} personnes`],
    ['Départ', `${formaterDateFr(d.dateDepart)} — ${d.sejour.villeDepart}`],
    ['Retour', `${formaterDateFr(d.dateRetour)} — ${d.sejour.villeRetour}`],
    ['Prix indicatif', `${formaterPrix(d.sejour.prixIndicatif)} pour ${d.sejour.nombreVoyageurs} (à confirmer)`],
  ]
}

const texteLignes = (lignes: Ligne[]) => lignes.map(([l, v]) => `- ${l} : ${v}`).join('\n')

interface BoutonEmail {
  libelle: string
  url: string
}

/** Gabarit HTML commun : simple, styles en ligne (seuls compris par toutes les messageries), lisible sur mobile. */
function gabaritHtml(titre: string, paragraphes: string[], lignes: Ligne[], piedDePage: string, bouton?: BoutonEmail): string {
  const tableau = lignes
    .map(([l, v]) =>
      `<tr><td style="padding:8px 12px 8px 0;color:#4b5a5d;vertical-align:top;white-space:nowrap">${echapperHtml(l)}</td>` +
      `<td style="padding:8px 0;color:#1f2d30;font-weight:600">${echapperHtml(v)}</td></tr>`)
    .join('')
  const blocTableau = lignes.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;font-size:15px">${tableau}</table>`
    : ''
  const blocBouton = bouton
    ? `<p style="margin:20px 0"><a href="${echapperHtml(bouton.url)}" style="display:inline-block;background:#b85a2b;color:#ffffff;` +
      `text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px">${echapperHtml(bouton.libelle)}</a></p>`
    : ''
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${echapperHtml(titre)}</title></head>
<body style="margin:0;padding:0;background:#faf6f0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1f2d30">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6f0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px">
<tr><td style="background:#173d45;color:#ffffff;padding:18px 24px;border-radius:12px 12px 0 0;font-weight:700;letter-spacing:1px">${echapperHtml(MARQUE.nom)}</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#173d45">${echapperHtml(titre)}</h1>
${paragraphes.map((p) => `<p style="margin:0 0 14px;white-space:pre-line">${echapperHtml(p)}</p>`).join('\n')}
${blocTableau}
${blocBouton}
<p style="margin:16px 0 0;font-size:13px;color:#4b5a5d">${echapperHtml(piedDePage)}</p>
</td></tr>
</table>
<p style="font-size:12px;color:#4b5a5d;margin:16px 0 0">${echapperHtml(`${MARQUE.nom} — ${MARQUE.activite}`)}</p>
</td></tr></table>
</body>
</html>`
}

/** Lien de suivi : bouton dans le HTML, adresse en clair dans la version texte. */
const boutonSuivi = (lien: string): BoutonEmail => ({ libelle: 'Suivre ma demande', url: lien })
const texteSuivi = (lien: string) =>
  `Suivre votre demande, l'annuler ou écrire à Vanlife :\n${lien}\n(Ce lien est personnel : ne le transmettez pas.)`

const PIED_CLIENT =
  "Vous recevez cet e-mail car une demande de réservation a été faite avec cette adresse sur le site Vanlife. " +
  "Si ce n'est pas vous, ignorez simplement ce message."
const PIED_EQUIPE = 'E-mail automatique envoyé par le site Vanlife.'

/** Au client, juste après sa demande. */
export function modeleAccuseReception(d: DemandeReservation, lien: string): ContenuEmail {
  const sujet = `Votre demande ${d.reference} — ${d.sejour.nom}`
  const titre = `Merci ${d.voyageur.prenom}, nous avons bien reçu votre demande`
  const paragraphes = [
    "Ce n'est pas encore une réservation : Vanlife vérifie la disponibilité du van pour cette date, " +
      'puis vous recontacte à cette adresse. Aucun paiement ne vous est demandé à ce stade.',
    `Votre référence : ${d.reference}. Depuis votre espace personnel, vous pouvez suivre votre demande, ` +
      "l'annuler ou écrire à Vanlife.",
  ]
  const lignes = lignesDemande(d)
  const texte = [
    `Bonjour ${d.voyageur.prenom},`,
    '',
    'Nous avons bien reçu votre demande de réservation.',
    ...paragraphes,
    '',
    'Récapitulatif :',
    texteLignes(lignes),
    '',
    texteSuivi(lien),
    '',
    `À bientôt sur la route,\nL'équipe ${MARQUE.nomCourt}`,
    '',
    '--',
    PIED_CLIENT,
  ].join('\n')
  return { sujet, texte, html: gabaritHtml(titre, paragraphes, lignes, PIED_CLIENT, boutonSuivi(lien)) }
}

/** À l'équipe Vanlife, à chaque nouvelle demande. */
export function modeleNotificationVanlife(d: DemandeReservation, message: string | null): ContenuEmail {
  const sujet = `Nouvelle demande ${d.reference} — départ le ${formaterDateFr(d.dateDepart)}`
  const titre = `Nouvelle demande : ${d.voyageur.prenom}, départ le ${formaterDateFr(d.dateDepart)}`
  const lignes: Ligne[] = [
    ...lignesDemande(d),
    ['Prénom', d.voyageur.prenom],
    ['E-mail', d.voyageur.email],
    ['Message', message ?? '(aucun)'],
  ]
  const paragraphes = ['Une nouvelle demande de réservation est arrivée. Elle attend votre réponse (statut : reçue).']
  const texte = [...paragraphes, '', texteLignes(lignes), '', PIED_EQUIPE].join('\n')
  return { sujet, texte, html: gabaritHtml(titre, paragraphes, lignes, PIED_EQUIPE) }
}

/** Texte annoncé au client pour chaque nouveau statut. */
const ANNONCES: Record<Exclude<StatutDemande, 'RECUE'>, { sujet: string; texte: string }> = {
  EN_ETUDE: {
    sujet: 'Votre demande est en cours d’étude',
    texte: 'Vanlife étudie votre demande et vérifie la disponibilité du van. Nous revenons vers vous très vite.',
  },
  CONFIRMEE: {
    sujet: 'Votre séjour est confirmé',
    texte: 'Bonne nouvelle : votre séjour est confirmé. Vanlife vous contactera pour les dernières modalités.',
  },
  REFUSEE: {
    sujet: 'Votre demande n’a pas pu être acceptée',
    texte: "Nous sommes désolés : votre demande n'a pas pu être acceptée pour cette date. " +
      "N'hésitez pas à faire une nouvelle demande pour un autre départ.",
  },
  ANNULEE: {
    sujet: 'Votre demande a été annulée',
    texte: 'Votre demande a bien été annulée. Aucun frais ne vous est demandé.',
  },
}

/** Au client, quand son statut change (par Vanlife, ou par lui-même pour une annulation). */
export function modeleChangementStatut(
  d: DemandeReservation,
  statut: Exclude<StatutDemande, 'RECUE'>,
  commentaire: string | null,
  lien: string,
): ContenuEmail {
  const annonce = ANNONCES[statut]
  const sujet = `${annonce.sujet} — ${d.reference}`
  const paragraphes = [annonce.texte, ...(commentaire ? [`Message de Vanlife : ${commentaire}`] : [])]
  const lignes = lignesDemande(d)
  const texte = [
    `Bonjour ${d.voyageur.prenom},`, '', ...paragraphes, '', 'Votre demande :', texteLignes(lignes), '',
    texteSuivi(lien), '', `L'équipe ${MARQUE.nomCourt}`, '', '--', PIED_CLIENT,
  ].join('\n')
  return { sujet, texte, html: gabaritHtml(annonce.sujet, paragraphes, lignes, PIED_CLIENT, boutonSuivi(lien)) }
}

/** Au client qui a demandé un nouveau lien de suivi (référence + e-mail). */
export function modeleLienSuivi(d: DemandeReservation, lien: string): ContenuEmail {
  const sujet = `Votre lien de suivi — ${d.reference}`
  const paragraphes = [
    `Voici le lien pour suivre votre demande ${d.reference} (${d.sejour.nom}, départ le ${formaterDateFr(d.dateDepart)}).`,
    "Si vous n'avez pas demandé ce lien, ignorez ce message : personne ne peut accéder à votre demande sans lui.",
  ]
  const texte = [`Bonjour ${d.voyageur.prenom},`, '', ...paragraphes, '', texteSuivi(lien), '', '--', PIED_CLIENT].join('\n')
  return { sujet, texte, html: gabaritHtml('Votre lien de suivi', paragraphes, [], PIED_CLIENT, boutonSuivi(lien)) }
}

/** Au client : message écrit par l'équipe Vanlife depuis le back-office. */
export function modeleMessageVanlife(d: DemandeReservation, message: string, signature: string, lien: string): ContenuEmail {
  const sujet = `Message de Vanlife — ${d.reference}`
  const paragraphes = [`${signature}, de l'équipe Vanlife, vous a écrit au sujet de votre demande ${d.reference} :`, message]
  const texte = [
    `Bonjour ${d.voyageur.prenom},`, '', ...paragraphes, '',
    'Pour répondre, utilisez votre espace de suivi :', lien, '(Ce lien est personnel : ne le transmettez pas.)',
    '', '--', PIED_CLIENT,
  ].join('\n')
  return {
    sujet,
    texte,
    html: gabaritHtml('Nouveau message de Vanlife', paragraphes, [], PIED_CLIENT, { libelle: 'Lire et répondre', url: lien }),
  }
}

/** À l'équipe : message envoyé par le client depuis son espace de suivi. */
export function modeleMessageClient(d: DemandeReservation, message: string): ContenuEmail {
  const sujet = `Message de ${d.voyageur.prenom} — ${d.reference}`
  const paragraphes = [
    `${d.voyageur.prenom} (${d.voyageur.email}) a écrit depuis son espace de suivi :`,
    message,
    'Répondez depuis le back-office (fiche de la demande) : la réponse lui sera envoyée par e-mail.',
  ]
  const lignes = lignesDemande(d)
  return {
    sujet,
    texte: [...paragraphes, '', texteLignes(lignes), '', PIED_EQUIPE].join('\n'),
    html: gabaritHtml(sujet, paragraphes, lignes, PIED_EQUIPE),
  }
}

/** À l'équipe : le client a annulé sa demande lui-même. */
export function modeleAnnulationClient(d: DemandeReservation, motif: string | null): ContenuEmail {
  const sujet = `Annulation par le client — ${d.reference}`
  const paragraphes = [
    `${d.voyageur.prenom} a annulé sa demande depuis son espace de suivi. La place est libérée.`,
    `Motif : ${motif ?? '(non précisé)'}`,
  ]
  const lignes = lignesDemande(d)
  return {
    sujet,
    texte: [...paragraphes, '', texteLignes(lignes), '', PIED_EQUIPE].join('\n'),
    html: gabaritHtml(sujet, paragraphes, lignes, PIED_EQUIPE),
  }
}
