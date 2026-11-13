// Lecture des séjours et des départs.
// Les réponses suivent les types du frontend (src/domain/types.ts), qui forment le contrat de l'API ;
// le détail d'un séjour est exactement au format `Sejour` affiché par les composants.
import { Prisma, StatutDemande, type PrismaClient } from '@prisma/client'
import type { DateIso, DepartDisponible, ResumeSejour, Sejour } from '../../../src/domain/types'
import { ajouterJours } from '../../../src/utils/dates'
import { versDate, versIso } from '../dates'

/** Statuts qui occupent une place sur un départ (une demande refusée ou annulée libère la place). */
export const STATUTS_ACTIFS: StatutDemande[] = [StatutDemande.RECUE, StatutDemande.EN_ETUDE, StatutDemande.CONFIRMEE]

const AVEC_CONTENU = {
  programme: { orderBy: { jour: 'asc' } },
  prestations: { orderBy: [{ type: 'asc' }, { ordre: 'asc' }] },
  questions: { orderBy: { ordre: 'asc' } },
  equipementsVan: { orderBy: { ordre: 'asc' } },
} satisfies Prisma.SejourInclude

type SejourAvecContenu = Prisma.SejourGetPayload<{ include: typeof AVEC_CONTENU }>

function versSejour(s: SejourAvecContenu): Sejour {
  return {
    id: s.id,
    nom: s.nom,
    accroche: s.accroche,
    destination: s.destination,
    duree: { jours: s.dureeJours, nuits: s.dureeNuits },
    public: s.public,
    nombreVoyageurs: s.nombreVoyageurs,
    villeDepart: s.villeDepart,
    villeRetour: s.villeRetour,
    programme: s.programme.map((j) => ({
      jour: j.jour,
      titre: j.titre,
      description: j.description,
      route: j.distanceKm !== null && j.dureeRouteMinutes !== null
        ? { distanceKm: j.distanceKm, dureeMinutes: j.dureeRouteMinutes }
        : null,
      nuit: j.lieuNuit ? { lieu: j.lieuNuit, aConfirmer: j.nuitAConfirmer } : null,
      activites: j.activites,
    })),
    prix: { montant: s.prixCentimes / 100, devise: 'EUR', pourPersonnes: s.nombreVoyageurs, aConfirmer: true },
    prestationsIncluses: s.prestations.filter((p) => p.type === 'INCLUSE').map((p) => p.libelle),
    depensesAPrevoir: s.prestations.filter((p) => p.type === 'A_PREVOIR').map((p) => p.libelle),
    elementsAConfirmer: s.elementsAConfirmer,
    faq: s.questions.map((q) => ({ question: q.question, reponse: q.reponse, aConfirmer: q.aConfirmer })),
    van: {
      presentation: s.presentationVan,
      equipements: s.equipementsVan.map((e) => ({ categorie: e.categorie, detail: e.detail })),
    },
  }
}

export async function listerSejours(prisma: PrismaClient): Promise<ResumeSejour[]> {
  const sejours = await prisma.sejour.findMany({ where: { publie: true }, orderBy: { nom: 'asc' } })
  return sejours.map((s) => ({
    id: s.id,
    nom: s.nom,
    accroche: s.accroche,
    destination: s.destination,
    duree: { jours: s.dureeJours, nuits: s.dureeNuits },
    prixIndicatif: s.prixCentimes / 100,
  }))
}

/** Séjour publié, ou null s'il n'existe pas ou n'est pas publié. */
export async function lireSejour(prisma: PrismaClient, id: string): Promise<Sejour | null> {
  const s = await prisma.sejour.findFirst({ where: { id, publie: true }, include: AVEC_CONTENU })
  return s ? versSejour(s) : null
}

/** Départs à venir (strictement après `aujourdhui`), hors départs fermés. Null si le séjour est inconnu. */
export async function listerDeparts(
  prisma: PrismaClient,
  sejourId: string,
  aujourdhui: DateIso,
): Promise<DepartDisponible[] | null> {
  const sejour = await prisma.sejour.findFirst({ where: { id: sejourId, publie: true } })
  if (!sejour) return null
  const departs = await prisma.depart.findMany({
    where: { sejourId, date: { gt: versDate(aujourdhui) }, statut: { not: 'FERME' } },
    orderBy: { date: 'asc' },
    include: { _count: { select: { demandes: { where: { statut: { in: STATUTS_ACTIFS } } } } } },
  })
  return departs.map((d) => {
    const placesRestantes = d.statut === 'COMPLET' ? 0 : Math.max(0, d.capacite - d._count.demandes)
    return {
      date: versIso(d.date),
      dateRetour: ajouterJours(versIso(d.date), sejour.dureeJours - 1),
      placesRestantes,
      complet: placesRestantes === 0,
    }
  })
}
