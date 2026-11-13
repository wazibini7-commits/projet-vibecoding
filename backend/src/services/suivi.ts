// Espace client : consultation par lien personnel, envoi d'un nouveau lien, annulation, messages.
import type { PrismaClient } from '@prisma/client'
import {
  MESSAGE_SUIVI_LONGUEUR_MAX, MOTIF_ANNULATION_LONGUEUR_MAX, STATUTS_ANNULABLES_PAR_CLIENT,
  type AccesSuivi, type SuiviDemande,
} from '../../../src/domain/suivi'
import { creerAccesSuivi, lienSuivi, verifierAccesSuivi } from '../auth/suivi'
import {
  modeleAnnulationClient, modeleChangementStatut, modeleLienSuivi, modeleMessageClient,
} from '../emails/modeles'
import { versIso } from '../dates'
import { AVEC_CLIENT_ET_SEJOUR, prenomEquipier, versDemandeReservation } from './vueDemande'

export interface ReglagesSuivi {
  emailEquipe: string
  siteUrl: string
}

/** Ce que voit le client : jamais la note interne, ni les noms complets de l'équipe. */
async function lireVueClient(prisma: PrismaClient, demandeId: string): Promise<SuiviDemande> {
  const d = await prisma.demande.findUniqueOrThrow({
    where: { id: demandeId },
    include: {
      ...AVEC_CLIENT_ET_SEJOUR,
      historique: { orderBy: { id: 'asc' }, select: { nouveauStatut: true, creeLe: true } },
      messages: { orderBy: { id: 'asc' }, include: { equipier: { select: { nom: true } } } },
    },
  })
  return {
    reference: d.reference,
    statut: d.statut,
    creeLe: d.creeLe.toISOString(),
    sejour: { id: d.depart.sejour.id, nom: d.depart.sejour.nom, villeDepart: d.depart.sejour.villeDepart, villeRetour: d.depart.sejour.villeRetour },
    dateDepart: versIso(d.depart.date),
    dateRetour: versIso(d.dateRetour),
    nombreVoyageurs: d.nombreVoyageurs,
    prixIndicatif: d.prixCentimes / 100,
    voyageur: { prenom: d.client.prenom, email: d.client.email },
    historique: d.historique.map((h) => ({ statut: h.nouveauStatut, le: h.creeLe.toISOString() })),
    messages: d.messages.map((m) => ({
      auteur: m.auteur,
      signature: m.auteur === 'VANLIFE' ? prenomEquipier(m.equipier?.nom) : null,
      texte: m.texte,
      le: m.creeLe.toISOString(),
    })),
    peutAnnuler: STATUTS_ANNULABLES_PAR_CLIENT.includes(d.statut),
  }
}

/** Demande vue par le client, ou null si le lien est invalide ou expiré. */
export async function lireSuivi(prisma: PrismaClient, acces: AccesSuivi, maintenant: Date): Promise<SuiviDemande | null> {
  const demandeId = await verifierAccesSuivi(prisma, acces.reference, acces.jeton, maintenant)
  return demandeId ? lireVueClient(prisma, demandeId) : null
}

/**
 * Le client a perdu son lien : il donne sa référence et son e-mail. Si les deux correspondent, un nouveau
 * lien part PAR E-MAIL (jamais dans la réponse). Renvoie vrai si un e-mail a été mis en file
 * — information réservée au serveur : la réponse HTTP est toujours la même.
 */
export async function demanderLien(
  prisma: PrismaClient, reference: string, email: string, maintenant: Date, reglages: ReglagesSuivi,
): Promise<boolean> {
  const d = await prisma.demande.findUnique({ where: { reference: reference.trim().toUpperCase() }, include: AVEC_CLIENT_ET_SEJOUR })
  if (!d || d.client.email !== email.trim().toLowerCase()) return false
  // Pas plus de 3 liens par heure pour une même demande (évite d'inonder la boîte du client).
  const recents = await prisma.emailSortant.count({
    where: { demandeId: d.id, type: 'LIEN_SUIVI', creeLe: { gt: new Date(maintenant.getTime() - 60 * 60_000) } },
  })
  if (recents >= 3) return false
  await prisma.$transaction(async (tx) => {
    const jeton = await creerAccesSuivi(tx, d.id, d.dateRetour, maintenant)
    const contenu = modeleLienSuivi(versDemandeReservation(d), lienSuivi(reglages.siteUrl, d.reference, jeton))
    await tx.emailSortant.create({
      data: { type: 'LIEN_SUIVI', demandeId: d.id, destinataire: d.client.email, ...contenu, creeLe: maintenant },
    })
  })
  return true
}

export type ResultatActionClient =
  | { type: 'ok'; suivi: SuiviDemande }
  | { type: 'acces-refuse' } // lien invalide ou expiré → 404
  | { type: 'invalide'; message: string } // 400
  | { type: 'impossible'; message: string } // 409 : l'état de la demande ne le permet pas

/** Le client annule sa demande (tant qu'elle n'est pas confirmée). La place est libérée ; Vanlife est prévenue. */
export async function annulerParClient(
  prisma: PrismaClient, acces: AccesSuivi, motifSaisi: string | undefined, maintenant: Date, reglages: ReglagesSuivi,
): Promise<ResultatActionClient> {
  const motif = motifSaisi?.trim() || null
  if (motif && motif.length > MOTIF_ANNULATION_LONGUEUR_MAX) {
    return { type: 'invalide', message: `Le motif ne doit pas dépasser ${MOTIF_ANNULATION_LONGUEUR_MAX} caractères.` }
  }
  const demandeId = await verifierAccesSuivi(prisma, acces.reference, acces.jeton, maintenant)
  if (!demandeId) return { type: 'acces-refuse' }

  const resultat = await prisma.$transaction(async (tx) => {
    const d = await tx.demande.findUniqueOrThrow({ where: { id: demandeId }, include: AVEC_CLIENT_ET_SEJOUR })
    if (!STATUTS_ANNULABLES_PAR_CLIENT.includes(d.statut)) {
      return d.statut === 'CONFIRMEE'
        ? 'Votre séjour est déjà confirmé : pour l’annuler, écrivez à Vanlife ci-dessous.'
        : 'Cette demande est déjà close.'
    }
    // Mise à jour conditionnelle : si Vanlife a changé le statut au même instant, on ne l'écrase pas.
    const maj = await tx.demande.updateMany({ where: { id: d.id, statut: d.statut }, data: { statut: 'ANNULEE' } })
    if (maj.count === 0) return "Votre demande vient d'être modifiée par Vanlife. Rechargez la page."
    await tx.historiqueStatut.create({
      data: {
        demandeId: d.id, ancienStatut: d.statut, nouveauStatut: 'ANNULEE', creeLe: maintenant,
        commentaire: `Annulée par le client${motif ? ` : ${motif}` : ''}`,
      },
    })
    const vue = { ...versDemandeReservation(d), statut: 'ANNULEE' as const }
    const jeton = await creerAccesSuivi(tx, d.id, d.dateRetour, maintenant)
    const auClient = modeleChangementStatut(vue, 'ANNULEE', null, lienSuivi(reglages.siteUrl, d.reference, jeton))
    const aLEquipe = modeleAnnulationClient(vue, motif)
    await tx.emailSortant.createMany({
      data: [
        { type: 'CHANGEMENT_STATUT', demandeId: d.id, destinataire: d.client.email, ...auClient },
        { type: 'ANNULATION_CLIENT', demandeId: d.id, destinataire: reglages.emailEquipe, ...aLEquipe },
      ],
    })
    return null
  })
  if (resultat) return { type: 'impossible', message: resultat }
  return { type: 'ok', suivi: await lireVueClient(prisma, demandeId) }
}

/** Message du client à l'équipe (visible dans le back-office, et envoyé par e-mail à l'équipe). */
export async function envoyerMessageClient(
  prisma: PrismaClient, acces: AccesSuivi, texteSaisi: string, maintenant: Date, reglages: ReglagesSuivi,
): Promise<ResultatActionClient> {
  const texte = texteSaisi.trim()
  if (!texte) return { type: 'invalide', message: 'Écrivez votre message.' }
  if (texte.length > MESSAGE_SUIVI_LONGUEUR_MAX) {
    return { type: 'invalide', message: `Le message ne doit pas dépasser ${MESSAGE_SUIVI_LONGUEUR_MAX} caractères.` }
  }
  const demandeId = await verifierAccesSuivi(prisma, acces.reference, acces.jeton, maintenant)
  if (!demandeId) return { type: 'acces-refuse' }
  await prisma.$transaction(async (tx) => {
    const d = await tx.demande.findUniqueOrThrow({ where: { id: demandeId }, include: AVEC_CLIENT_ET_SEJOUR })
    await tx.messageDemande.create({ data: { demandeId, auteur: 'CLIENT', texte, creeLe: maintenant } })
    const contenu = modeleMessageClient(versDemandeReservation(d), texte)
    await tx.emailSortant.create({ data: { type: 'MESSAGE_CLIENT', demandeId, destinataire: reglages.emailEquipe, ...contenu } })
  })
  return { type: 'ok', suivi: await lireVueClient(prisma, demandeId) }
}
