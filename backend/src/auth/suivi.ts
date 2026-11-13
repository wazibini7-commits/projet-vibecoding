// Liens personnels de suivi (« liens magiques ») : un secret aléatoire de 256 bits, envoyé par e-mail,
// dont la base ne garde que l'empreinte. Un nouveau lien est créé pour chaque e-mail envoyé au client.
import { randomBytes } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { cheminSuivi } from '../../../src/domain/suivi'
import { empreinteJeton } from './securite'

/** Un lien reste valable jusqu'à 30 jours après la date de retour du séjour. */
export const VALIDITE_APRES_RETOUR_MS = 30 * 86_400_000

type Client = PrismaClient | Prisma.TransactionClient

/** Crée un accès et renvoie le secret (à mettre dans un lien, jamais stocké en clair). */
export async function creerAccesSuivi(db: Client, demandeId: string, dateRetour: Date, maintenant: Date): Promise<string> {
  const jeton = randomBytes(32).toString('base64url')
  await db.accesSuivi.create({
    data: {
      id: empreinteJeton(jeton),
      demandeId,
      creeLe: maintenant,
      expireLe: new Date(Math.max(dateRetour.getTime(), maintenant.getTime()) + VALIDITE_APRES_RETOUR_MS),
    },
  })
  return jeton
}

/** Identifiant de la demande si le secret correspond bien à CETTE référence et n'a pas expiré ; sinon null. */
export async function verifierAccesSuivi(db: Client, reference: string, jeton: string, maintenant: Date): Promise<string | null> {
  if (!jeton || jeton.length > 100) return null
  const acces = await db.accesSuivi.findUnique({
    where: { id: empreinteJeton(jeton) },
    include: { demande: { select: { id: true, reference: true } } },
  })
  if (!acces || acces.expireLe <= maintenant || acces.demande.reference !== reference) return null
  return acces.demande.id
}

/** Adresse complète de la page de suivi, ex. https://vanlife.bzh/#/suivi/VL-2027-0001/… */
export const lienSuivi = (siteUrl: string, reference: string, jeton: string) =>
  `${siteUrl.replace(/\/+$/, '')}/${cheminSuivi(reference, jeton)}`
