// Traitement des demandes par l'équipe Vanlife : liste, détail, changement de statut, note interne, export.
import { Prisma, type PrismaClient } from '@prisma/client'
import {
  COMMENTAIRE_LONGUEUR_MAX, LIBELLES_STATUT, NOTE_LONGUEUR_MAX, STATUTS, TRANSITIONS, transitionPermise,
  type ChangementStatut, type DetailDemande, type FiltresDemandes, type PageDemandes, type UtilisateurConnecte,
} from '../../../../src/domain/admin'
import type { DemandeReservation, StatutDemande } from '../../../../src/domain/types'
import { modeleChangementStatut } from '../../emails/modeles'
import { versIso } from '../../dates'

export const PAR_PAGE = 25

function filtreRecherche(recherche?: string): Prisma.DemandeWhereInput {
  const r = recherche?.trim()
  if (!r) return {}
  const contient = { contains: r, mode: 'insensitive' as const }
  return {
    OR: [
      { reference: contient },
      { client: { email: contient } },
      { client: { prenom: contient } },
      { client: { nom: contient } },
    ],
  }
}

export async function listerDemandes(prisma: PrismaClient, filtres: FiltresDemandes): Promise<PageDemandes> {
  const page = Math.max(1, filtres.page ?? 1)
  const recherche = filtreRecherche(filtres.recherche)
  const where: Prisma.DemandeWhereInput = { ...recherche, ...(filtres.statut ? { statut: filtres.statut } : {}) }

  const [demandes, total, parStatut] = await Promise.all([
    prisma.demande.findMany({
      where,
      orderBy: { creeLe: 'desc' },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
      include: {
        client: { select: { prenom: true, nom: true, email: true } },
        depart: { select: { date: true, sejour: { select: { nom: true } } } },
      },
    }),
    prisma.demande.count({ where }),
    prisma.demande.groupBy({ by: ['statut'], where: recherche, _count: true }),
  ])

  const compteurs = Object.fromEntries(STATUTS.map((s) => [s, 0])) as Record<StatutDemande, number>
  for (const g of parStatut) compteurs[g.statut] = g._count

  return {
    demandes: demandes.map((d) => ({
      reference: d.reference,
      statut: d.statut,
      creeLe: d.creeLe.toISOString(),
      dateDepart: versIso(d.depart.date),
      sejourNom: d.depart.sejour.nom,
      client: d.client,
    })),
    total,
    page,
    parPage: PAR_PAGE,
    compteurs,
  }
}

const AVEC_TOUT = {
  client: true,
  depart: { include: { sejour: true } },
  historique: { orderBy: { id: 'asc' }, include: { auteur: { select: { nom: true } } } },
  emails: { orderBy: { id: 'asc' } },
} satisfies Prisma.DemandeInclude

export async function lireDemande(prisma: PrismaClient, reference: string): Promise<DetailDemande | null> {
  const d = await prisma.demande.findUnique({ where: { reference }, include: AVEC_TOUT })
  if (!d) return null
  return {
    reference: d.reference,
    statut: d.statut,
    creeLe: d.creeLe.toISOString(),
    modifieLe: d.modifieLe.toISOString(),
    sejour: { id: d.depart.sejour.id, nom: d.depart.sejour.nom },
    dateDepart: versIso(d.depart.date),
    dateRetour: versIso(d.dateRetour),
    nombreVoyageurs: d.nombreVoyageurs,
    prixIndicatif: d.prixCentimes / 100,
    message: d.message,
    noteInterne: d.noteInterne,
    client: { prenom: d.client.prenom, nom: d.client.nom, email: d.client.email, telephone: d.client.telephone },
    historique: d.historique.map((h) => ({
      ancienStatut: h.ancienStatut,
      nouveauStatut: h.nouveauStatut,
      le: h.creeLe.toISOString(),
      auteur: h.auteur?.nom ?? null,
      commentaire: h.commentaire,
    })),
    emails: d.emails.map((e) => ({
      type: e.type,
      destinataire: e.destinataire,
      sujet: e.sujet,
      statut: e.statut,
      tentatives: e.tentatives,
      creeLe: e.creeLe.toISOString(),
      envoyeLe: e.envoyeLe?.toISOString() ?? null,
      derniereErreur: e.derniereErreur,
    })),
    transitionsPossibles: TRANSITIONS[d.statut],
  }
}

export type ResultatChangement =
  | { type: 'ok'; demande: DetailDemande; emailEnFile: boolean }
  | { type: 'introuvable' }
  | { type: 'invalide'; message: string } // 400
  | { type: 'conflit'; message: string } // 409 : modifiée entre-temps

/**
 * Change le statut d'une demande : historique (auteur, commentaire) et, si demandé, e-mail au client
 * mis en file — le tout dans une seule transaction.
 */
export async function changerStatut(
  prisma: PrismaClient,
  reference: string,
  changement: ChangementStatut,
  auteur: UtilisateurConnecte,
  maintenant: Date,
): Promise<ResultatChangement> {
  const commentaire = changement.commentaire?.trim() || null
  if (commentaire && commentaire.length > COMMENTAIRE_LONGUEUR_MAX) {
    return { type: 'invalide', message: `Le commentaire ne doit pas dépasser ${COMMENTAIRE_LONGUEUR_MAX} caractères.` }
  }

  type ResultatTransaction = Exclude<ResultatChangement, { type: 'ok' }> | { type: 'ok' }
  const resultat = await prisma.$transaction(async (tx): Promise<ResultatTransaction> => {
    const d = await tx.demande.findUnique({ where: { reference }, include: { client: true, depart: { include: { sejour: true } } } })
    if (!d) return { type: 'introuvable' }
    if (d.statut === changement.statut) {
      return { type: 'invalide', message: 'La demande a déjà ce statut.' }
    }
    if (!transitionPermise(d.statut, changement.statut)) {
      return {
        type: 'invalide',
        message: `Une demande « ${LIBELLES_STATUT[d.statut]} » ne peut pas passer à « ${LIBELLES_STATUT[changement.statut]} ».`,
      }
    }
    // Mise à jour conditionnelle : échoue si quelqu'un d'autre a changé le statut entre-temps.
    const maj = await tx.demande.updateMany({
      where: { id: d.id, statut: d.statut },
      data: { statut: changement.statut },
    })
    if (maj.count === 0) {
      return { type: 'conflit', message: "Cette demande vient d'être modifiée par quelqu'un d'autre. Rechargez la page." }
    }
    await tx.historiqueStatut.create({
      data: {
        demandeId: d.id, ancienStatut: d.statut, nouveauStatut: changement.statut,
        auteurId: auteur.id, commentaire, creeLe: maintenant,
      },
    })

    if (changement.informerClient && changement.statut !== 'RECUE') {
      const pourEmail: DemandeReservation = {
        reference: d.reference,
        statut: changement.statut,
        creeeLe: d.creeLe.toISOString(),
        sejour: {
          id: d.depart.sejour.id, nom: d.depart.sejour.nom,
          jours: d.depart.sejour.dureeJours, nuits: d.depart.sejour.dureeNuits,
          nombreVoyageurs: d.nombreVoyageurs, villeDepart: d.depart.sejour.villeDepart,
          villeRetour: d.depart.sejour.villeRetour, prixIndicatif: d.prixCentimes / 100,
        },
        voyageur: { prenom: d.client.prenom, email: d.client.email },
        dateDepart: versIso(d.depart.date),
        dateRetour: versIso(d.dateRetour),
      }
      const contenu = modeleChangementStatut(pourEmail, changement.statut, commentaire)
      await tx.emailSortant.create({
        data: { type: 'CHANGEMENT_STATUT', demandeId: d.id, destinataire: d.client.email, ...contenu },
      })
    }
    return { type: 'ok' }
  })

  if (resultat.type !== 'ok') return resultat
  return { type: 'ok', demande: (await lireDemande(prisma, reference))!, emailEnFile: changement.informerClient }
}

export async function modifierNote(prisma: PrismaClient, reference: string, note: string): Promise<'ok' | 'introuvable' | 'trop-longue'> {
  const valeur = note.trim()
  if (valeur.length > NOTE_LONGUEUR_MAX) return 'trop-longue'
  const { count } = await prisma.demande.updateMany({ where: { reference }, data: { noteInterne: valeur || null } })
  return count ? 'ok' : 'introuvable'
}

// ---------- Export CSV (tableur) ----------

/**
 * Cellule CSV sûre : guillemets doublés, et neutralisation des formules (une valeur commençant par
 * = + - @ serait exécutée par Excel : « injection de formule »).
 */
export function celluleCsv(valeur: string | number | null): string {
  let v = valeur === null ? '' : String(valeur)
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`
  return `"${v.replaceAll('"', '""')}"`
}

export async function exporterCsv(prisma: PrismaClient, filtres: FiltresDemandes): Promise<string> {
  const demandes = await prisma.demande.findMany({
    where: { ...filtreRecherche(filtres.recherche), ...(filtres.statut ? { statut: filtres.statut } : {}) },
    orderBy: { creeLe: 'desc' },
    include: { client: true, depart: { include: { sejour: true } } },
  })
  const entete = ['Référence', 'Statut', 'Reçue le', 'Séjour', 'Départ', 'Retour', 'Prénom', 'Nom', 'E-mail', 'Téléphone', 'Prix indicatif (€)', 'Message']
  const lignes = demandes.map((d) => [
    d.reference, d.statut, d.creeLe.toISOString(), d.depart.sejour.nom, versIso(d.depart.date), versIso(d.dateRetour),
    d.client.prenom, d.client.nom, d.client.email, d.client.telephone, d.prixCentimes / 100, d.message,
  ])
  // Point-virgule et marque BOM : ouverture directe et accents corrects dans Excel en français.
  return '﻿' + [entete, ...lignes].map((l) => l.map(celluleCsv).join(';')).join('\r\n') + '\r\n'
}
