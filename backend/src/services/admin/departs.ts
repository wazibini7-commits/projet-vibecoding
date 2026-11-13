// Gestion des départs par l'équipe Vanlife : liste avec remplissage, création, capacité, ouverture/fermeture.
import type { PrismaClient } from '@prisma/client'
import type { DepartAdmin, ModificationDepart, NouveauDepart } from '../../../../src/domain/admin'
import type { DateIso } from '../../../../src/domain/types'
import { estDateIsoValide } from '../../../../src/utils/dates'
import { versDate, versIso } from '../../dates'
import { STATUTS_ACTIFS } from '../sejours'

export const CAPACITE_MAX = 20

/** Départs d'un séjour, des 30 derniers jours à la fin du calendrier, avec leur remplissage. */
export async function listerDepartsAdmin(prisma: PrismaClient, sejourId: string, aujourdhui: DateIso): Promise<DepartAdmin[] | null> {
  if (!(await prisma.sejour.findUnique({ where: { id: sejourId } }))) return null
  const depuis = new Date(versDate(aujourdhui).getTime() - 30 * 86_400_000)
  const departs = await prisma.depart.findMany({
    where: { sejourId, date: { gte: depuis } },
    orderBy: { date: 'asc' },
    include: { demandes: { where: { statut: { in: STATUTS_ACTIFS } }, select: { statut: true } } },
  })
  return departs.map((d) => ({
    id: d.id,
    date: versIso(d.date),
    capacite: d.capacite,
    statut: d.statut,
    demandesActives: d.demandes.length,
    demandesConfirmees: d.demandes.filter((x) => x.statut === 'CONFIRMEE').length,
  }))
}

async function lireDepartAdmin(prisma: PrismaClient, id: number): Promise<DepartAdmin> {
  const d = await prisma.depart.findUniqueOrThrow({
    where: { id },
    include: { demandes: { where: { statut: { in: STATUTS_ACTIFS } }, select: { statut: true } } },
  })
  return {
    id: d.id, date: versIso(d.date), capacite: d.capacite, statut: d.statut,
    demandesActives: d.demandes.length,
    demandesConfirmees: d.demandes.filter((x) => x.statut === 'CONFIRMEE').length,
  }
}

export type ResultatDepart =
  | { type: 'ok'; depart: DepartAdmin }
  | { type: 'introuvable' }
  | { type: 'invalide'; message: string }

const capaciteInvalide = (c: number) => !Number.isInteger(c) || c < 1 || c > CAPACITE_MAX

export async function creerDepart(prisma: PrismaClient, nouveau: NouveauDepart, aujourdhui: DateIso): Promise<ResultatDepart> {
  if (!(await prisma.sejour.findUnique({ where: { id: nouveau.sejourId } }))) return { type: 'introuvable' }
  if (!estDateIsoValide(nouveau.date)) return { type: 'invalide', message: "La date n'est pas valide." }
  if (nouveau.date <= aujourdhui) return { type: 'invalide', message: 'La date de départ doit être postérieure à aujourd’hui.' }
  if (capaciteInvalide(nouveau.capacite)) {
    return { type: 'invalide', message: `La capacité doit être un nombre entier de vans, entre 1 et ${CAPACITE_MAX}.` }
  }
  const existant = await prisma.depart.findUnique({
    where: { sejourId_date: { sejourId: nouveau.sejourId, date: versDate(nouveau.date) } },
  })
  if (existant) return { type: 'invalide', message: 'Un départ existe déjà à cette date.' }
  const d = await prisma.depart.create({
    data: { sejourId: nouveau.sejourId, date: versDate(nouveau.date), capacite: nouveau.capacite },
  })
  return { type: 'ok', depart: await lireDepartAdmin(prisma, d.id) }
}

/** Capacité (jamais en dessous des places déjà prises) et statut (ouvert, complet forcé, fermé). */
export async function modifierDepart(prisma: PrismaClient, id: number, modif: ModificationDepart): Promise<ResultatDepart> {
  if (modif.capacite !== undefined && capaciteInvalide(modif.capacite)) {
    return { type: 'invalide', message: `La capacité doit être un nombre entier de vans, entre 1 et ${CAPACITE_MAX}.` }
  }
  return prisma.$transaction(async (tx): Promise<ResultatDepart> => {
    const depart = await tx.depart.findUnique({ where: { id } })
    if (!depart) return { type: 'introuvable' }
    await tx.$queryRaw`SELECT id FROM departs WHERE id = ${id} FOR UPDATE` // pas de demande pendant la modification
    const actives = await tx.demande.count({ where: { departId: id, statut: { in: STATUTS_ACTIFS } } })
    if (modif.capacite !== undefined && modif.capacite < actives) {
      return {
        type: 'invalide',
        message: `Impossible : ${actives} demande(s) occupent déjà ce départ. Refusez ou annulez-en d'abord.`,
      }
    }
    await tx.depart.update({ where: { id }, data: { capacite: modif.capacite, statut: modif.statut } })
    return { type: 'ok', depart: await lireDepartAdmin(tx as PrismaClient, id) }
  })
}
