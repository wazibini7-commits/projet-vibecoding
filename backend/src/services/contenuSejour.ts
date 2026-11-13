// Écriture du contenu d'un séjour (fiche, programme, prestations, FAQ, van) à partir du format partagé `Sejour`.
// Utilisée par le remplissage de la base (prisma/seed.ts) et par les tests : une seule façon d'écrire un séjour.
import type { PrismaClient } from '@prisma/client'
import type { Sejour } from '../../../src/domain/types'

/** Crée ou met à jour le séjour et REMPLACE tout son contenu (les départs et demandes ne sont pas touchés). */
export async function ecrireContenuSejour(prisma: PrismaClient, s: Sejour, options: { publie?: boolean } = {}) {
  const fiche = {
    nom: s.nom,
    accroche: s.accroche,
    destination: s.destination,
    dureeJours: s.duree.jours,
    dureeNuits: s.duree.nuits,
    public: s.public,
    nombreVoyageurs: s.nombreVoyageurs,
    villeDepart: s.villeDepart,
    villeRetour: s.villeRetour,
    prixCentimes: Math.round(s.prix.montant * 100),
    devise: s.prix.devise,
    prixAConfirmer: s.prix.aConfirmer,
    elementsAConfirmer: s.elementsAConfirmer,
    presentationVan: s.van.presentation,
    publie: options.publie ?? true,
  }
  await prisma.$transaction([
    prisma.sejour.upsert({ where: { id: s.id }, create: { id: s.id, ...fiche }, update: fiche }),
    prisma.jourProgramme.deleteMany({ where: { sejourId: s.id } }),
    prisma.prestation.deleteMany({ where: { sejourId: s.id } }),
    prisma.questionFrequente.deleteMany({ where: { sejourId: s.id } }),
    prisma.equipementVan.deleteMany({ where: { sejourId: s.id } }),
    prisma.jourProgramme.createMany({
      data: s.programme.map((j) => ({
        sejourId: s.id,
        jour: j.jour,
        titre: j.titre,
        description: j.description,
        distanceKm: j.route?.distanceKm ?? null,
        dureeRouteMinutes: j.route?.dureeMinutes ?? null,
        lieuNuit: j.nuit?.lieu ?? null,
        nuitAConfirmer: j.nuit?.aConfirmer ?? false,
        activites: j.activites,
      })),
    }),
    prisma.prestation.createMany({
      data: [
        ...s.prestationsIncluses.map((libelle, ordre) => ({ sejourId: s.id, type: 'INCLUSE' as const, libelle, ordre })),
        ...s.depensesAPrevoir.map((libelle, ordre) => ({ sejourId: s.id, type: 'A_PREVOIR' as const, libelle, ordre })),
      ],
    }),
    prisma.questionFrequente.createMany({
      data: s.faq.map((q, ordre) => ({ sejourId: s.id, ordre, question: q.question, reponse: q.reponse, aConfirmer: q.aConfirmer })),
    }),
    prisma.equipementVan.createMany({
      data: s.van.equipements.map((e, ordre) => ({ sejourId: s.id, ordre, categorie: e.categorie, detail: e.detail })),
    }),
  ])
}
