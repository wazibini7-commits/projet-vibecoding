// Outils communs aux tests : application prête à l'emploi et jeux de données.
import { PrismaClient } from '@prisma/client'
import { SEJOUR_BRETAGNE_SAUVAGE as S } from '../../src/data/sejour'
import { construireApp } from '../src/app'
import { versDate } from '../src/dates'
import { ecrireContenuSejour } from '../src/services/contenuSejour'

export const prisma = new PrismaClient()

/** « Aujourd'hui » pour tous les tests : 10 janvier 2027, en milieu de journée. */
export const MAINTENANT = new Date(2027, 0, 10, 12, 0, 0)

export const EMAIL_EQUIPE = 'equipe@vanlife.example'
/** Adresse du site : exigée sur les requêtes de modification du back-office. */
export const ORIGINE = 'http://localhost:5173'
export const SITE_URL = 'https://vanlife.example'

export function creerApp(options: { limiteDemandesParMinute?: number; limiteConnexionsParMinute?: number; declencherEnvoi?: () => void } = {}) {
  return construireApp({
    prisma,
    horloge: () => MAINTENANT,
    originesAutorisees: [ORIGINE],
    cookieSecurise: false,
    siteUrl: SITE_URL,
    limiteDemandesParMinute: options.limiteDemandesParMinute ?? 1000,
    limiteConnexionsParMinute: options.limiteConnexionsParMinute ?? 1000,
    emails: { equipe: EMAIL_EQUIPE, declencherEnvoi: options.declencherEnvoi ?? (() => {}) },
  })
}

/** Vide toutes les tables et remet le compteur de références à 1. */
export async function viderBase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE questions_frequentes, equipements_van, acces_suivi, messages_demandes, sessions, emails_sortants, historique_statuts, demandes, clients, departs, prestations, jours_programme, sejours, utilisateurs RESTART IDENTITY CASCADE',
  )
  await prisma.$executeRawUnsafe('ALTER SEQUENCE demande_reference_seq RESTART WITH 1')
}

/** Séjour Bretagne Sauvage (contenu du frontend) et quelques départs. */
export async function creerSejour(departs: { date: string; capacite?: number; statut?: 'OUVERT' | 'COMPLET' | 'FERME' }[] = []) {
  await ecrireContenuSejour(prisma, S, { publie: true })
  await prisma.depart.createMany({
    data: departs.map((d) => ({ sejourId: S.id, date: versDate(d.date), capacite: d.capacite ?? 2, statut: d.statut })),
  })
}

export const DEMANDE_VALIDE = {
  sejourId: 'bretagne-sauvage',
  prenom: 'Camille',
  email: 'camille@exemple.fr',
  dateDepart: '2027-05-15',
}
