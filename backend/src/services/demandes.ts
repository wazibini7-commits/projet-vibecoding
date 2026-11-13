// Enregistrement des demandes de réservation (le suivi par le client est dans services/suivi.ts).
// Les règles de saisie (prénom, e-mail, date) sont CELLES DU FRONTEND (src/domain/validation.ts) :
// mêmes contrôles, mêmes messages, une seule source de vérité.
// Le serveur ajoute les règles qu'il est seul à pouvoir vérifier : départ existant, places restantes, doublon.
import { Prisma, StatutDemande, type PrismaClient } from '@prisma/client'
import type {
  DateIso, DemandeEnregistree, DemandeReservation, EntreeDemande, ErreursServeur,
} from '../../../src/domain/types'
import { validerDemande } from '../../../src/domain/validation'
import { ajouterJours } from '../../../src/utils/dates'
import { versDate, versIso } from '../dates'
import { STATUTS_ACTIFS } from './sejours'
import { modeleAccuseReception, modeleNotificationVanlife } from '../emails/modeles'
import { creerAccesSuivi, lienSuivi } from '../auth/suivi'

export const MESSAGE_LONGUEUR_MAX = 1000

export const MESSAGES_SERVEUR = {
  pasDeDepart: "Aucun départ n'est proposé à cette date. Choisissez une date dans la liste des départs disponibles.",
  departComplet: 'Ce départ est complet. Choisissez une autre date.',
  doublon: (reference: string) =>
    `Vous avez déjà une demande en cours pour ce départ (référence ${reference}).`,
  messageTropLong: `Le message ne doit pas dépasser ${MESSAGE_LONGUEUR_MAX} caractères.`,
} as const

export type { EntreeDemande, ErreursServeur }

export type ResultatEnregistrement =
  | { type: 'ok'; demande: DemandeEnregistree }
  | { type: 'sejour-inconnu' }
  | { type: 'invalide'; erreurs: ErreursServeur } // saisie incorrecte → 400
  | { type: 'conflit'; erreurs: ErreursServeur } // départ complet ou doublon → 409

async function departOuvertExiste(prisma: PrismaClient, sejourId: string, date: DateIso): Promise<boolean> {
  const depart = await prisma.depart.findUnique({ where: { sejourId_date: { sejourId, date: versDate(date) } } })
  return depart !== null && depart.statut !== 'FERME'
}

/** Référence lisible : VL-2027-0042 (numéro tiré d'une séquence PostgreSQL, donc unique). */
function formaterReference(annee: number, numero: bigint): string {
  return `VL-${annee}-${numero.toString().padStart(4, '0')}`
}

export async function enregistrerDemande(
  prisma: PrismaClient,
  entree: EntreeDemande,
  maintenant: Date,
  aujourdhui: DateIso,
  options: { emailEquipe: string; siteUrl: string },
): Promise<ResultatEnregistrement> {
  const sejour = await prisma.sejour.findFirst({ where: { id: entree.sejourId, publie: true } })
  if (!sejour) return { type: 'sejour-inconnu' }

  // 1. Règles de saisie partagées avec le frontend.
  const validation = validerDemande(
    { prenom: entree.prenom, email: entree.email, dateDepart: entree.dateDepart },
    aujourdhui,
  )
  const erreurs: ErreursServeur = validation.valide ? {} : { ...validation.erreurs }
  const message = entree.message?.trim() || null
  if (message && message.length > MESSAGE_LONGUEUR_MAX) erreurs.message = MESSAGES_SERVEUR.messageTropLong
  if (!validation.valide || Object.keys(erreurs).length > 0) {
    // Date correcte mais autres champs en erreur : signaler aussi tout de suite l'absence de départ,
    // pour que le client corrige tout en une fois.
    if (!erreurs.dateDepart && !(await departOuvertExiste(prisma, sejour.id, entree.dateDepart.trim()))) {
      erreurs.dateDepart = MESSAGES_SERVEUR.pasDeDepart
    }
    return { type: 'invalide', erreurs }
  }

  const donnees = validation.donnees
  const email = donnees.email.toLowerCase()

  // 2. Règles du serveur, dans une transaction : le départ est verrouillé pendant le comptage des places,
  //    pour que deux demandes simultanées ne puissent pas prendre la dernière place.
  return prisma.$transaction(async (tx): Promise<ResultatEnregistrement> => {
    const depart = await tx.depart.findUnique({
      where: { sejourId_date: { sejourId: sejour.id, date: versDate(donnees.dateDepart) } },
    })
    if (!depart || depart.statut === 'FERME') {
      return { type: 'invalide', erreurs: { dateDepart: MESSAGES_SERVEUR.pasDeDepart } }
    }
    await tx.$queryRaw`SELECT id FROM departs WHERE id = ${depart.id} FOR UPDATE`

    const actives = await tx.demande.findMany({
      where: { departId: depart.id, statut: { in: STATUTS_ACTIFS } },
      select: { reference: true, client: { select: { email: true } } },
    })
    const doublon = actives.find((d) => d.client.email === email)
    if (doublon) return { type: 'conflit', erreurs: { dateDepart: MESSAGES_SERVEUR.doublon(doublon.reference) } }
    if (depart.statut === 'COMPLET' || actives.length >= depart.capacite) {
      return { type: 'conflit', erreurs: { dateDepart: MESSAGES_SERVEUR.departComplet } }
    }

    const client = await tx.client.upsert({
      where: { email },
      create: { prenom: donnees.prenom, email },
      update: { prenom: donnees.prenom },
    })
    const [{ numero }] = await tx.$queryRaw<{ numero: bigint }[]>`SELECT nextval('demande_reference_seq') AS numero`
    const demande = await tx.demande.create({
      data: {
        reference: formaterReference(maintenant.getFullYear(), numero),
        clientId: client.id,
        departId: depart.id,
        dateRetour: versDate(ajouterJours(donnees.dateDepart, sejour.dureeJours - 1)),
        nombreVoyageurs: sejour.nombreVoyageurs,
        prixCentimes: sejour.prixCentimes, // prix figé au moment de la demande
        message,
        creeLe: maintenant,
        historique: { create: { nouveauStatut: StatutDemande.RECUE, creeLe: maintenant } },
      },
    })

    const enregistree: DemandeReservation = {
      reference: demande.reference,
      statut: demande.statut,
      creeeLe: demande.creeLe.toISOString(),
      sejour: {
        id: sejour.id,
        nom: sejour.nom,
        jours: sejour.dureeJours,
        nuits: sejour.dureeNuits,
        nombreVoyageurs: sejour.nombreVoyageurs,
        villeDepart: sejour.villeDepart,
        villeRetour: sejour.villeRetour,
        prixIndicatif: demande.prixCentimes / 100,
      },
      voyageur: { prenom: client.prenom, email: client.email },
      dateDepart: donnees.dateDepart,
      dateRetour: versIso(demande.dateRetour),
    }

    // E-mails mis en file DANS la même transaction : si la demande est enregistrée, ses e-mails le sont
    // aussi (et inversement). L'envoi réel se fait ensuite en arrière-plan (src/emails/file.ts).
    // Lien personnel « Suivre ma demande » : dans l'accusé de réception et sur la page de confirmation.
    const jetonSuivi = await creerAccesSuivi(tx, demande.id, demande.dateRetour, maintenant)
    const accuse = modeleAccuseReception(enregistree, lienSuivi(options.siteUrl, demande.reference, jetonSuivi))
    const notification = modeleNotificationVanlife(enregistree, message)
    await tx.emailSortant.createMany({
      data: [
        { type: 'ACCUSE_RECEPTION', demandeId: demande.id, destinataire: client.email, ...accuse },
        { type: 'NOTIFICATION_VANLIFE', demandeId: demande.id, destinataire: options.emailEquipe, ...notification },
      ],
    })

    return { type: 'ok', demande: { ...enregistree, jetonSuivi } }
  })
}

/** Erreur Prisma de contrainte d'unicité (ex. référence déjà prise) — utile pour réessayer. */
export const estConflitUnicite = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
