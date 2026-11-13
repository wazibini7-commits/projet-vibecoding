// Outils communs aux tests : application prête à l'emploi et jeux de données.
import { PrismaClient } from '@prisma/client'
import { SEJOUR_BRETAGNE_SAUVAGE as S } from '../../src/data/sejour'
import { construireApp } from '../src/app'
import { versDate } from '../src/dates'

export const prisma = new PrismaClient()

/** « Aujourd'hui » pour tous les tests : 10 janvier 2027, en milieu de journée. */
export const MAINTENANT = new Date(2027, 0, 10, 12, 0, 0)

export function creerApp(options: { limiteDemandesParMinute?: number } = {}) {
  return construireApp({
    prisma,
    horloge: () => MAINTENANT,
    originesAutorisees: ['http://localhost:5173'],
    limiteDemandesParMinute: options.limiteDemandesParMinute ?? 1000,
  })
}

/** Vide toutes les tables et remet le compteur de références à 1. */
export async function viderBase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE historique_statuts, demandes, clients, departs, prestations, jours_programme, sejours, utilisateurs RESTART IDENTITY CASCADE',
  )
  await prisma.$executeRawUnsafe('ALTER SEQUENCE demande_reference_seq RESTART WITH 1')
}

/** Séjour Bretagne Sauvage (contenu du frontend) et quelques départs. */
export async function creerSejour(departs: { date: string; capacite?: number; statut?: 'OUVERT' | 'COMPLET' | 'FERME' }[] = []) {
  await prisma.sejour.create({
    data: {
      id: S.id,
      nom: S.nom,
      accroche: S.accroche,
      destination: S.destination,
      dureeJours: S.duree.jours,
      dureeNuits: S.duree.nuits,
      public: S.public,
      nombreVoyageurs: S.nombreVoyageurs,
      villeDepart: S.villeDepart,
      villeRetour: S.villeRetour,
      prixCentimes: S.prix.montant * 100,
      elementsAConfirmer: S.elementsAConfirmer,
      publie: true,
      programme: { create: S.programme.map((j) => ({ jour: j.jour, titre: j.titre, description: j.description })) },
      prestations: {
        create: [
          ...S.prestationsIncluses.map((libelle, ordre) => ({ type: 'INCLUSE' as const, libelle, ordre })),
          ...S.depensesAPrevoir.map((libelle, ordre) => ({ type: 'A_PREVOIR' as const, libelle, ordre })),
        ],
      },
      departs: { create: departs.map((d) => ({ date: versDate(d.date), capacite: d.capacite ?? 2, statut: d.statut })) },
    },
  })
}

export const DEMANDE_VALIDE = {
  sejourId: 'bretagne-sauvage',
  prenom: 'Camille',
  email: 'camille@exemple.fr',
  dateDepart: '2027-05-15',
}
