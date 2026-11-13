// Mots de passe et sessions du back-office.
import { createHash, randomBytes } from 'node:crypto'
import { hash, verify } from '@node-rs/argon2'
import type { PrismaClient } from '@prisma/client'
import { MOT_DE_PASSE_LONGUEUR_MIN, type UtilisateurConnecte } from '../../../src/domain/admin'

/** Durée d'une session : une journée de travail. Au-delà, il faut se reconnecter. */
export const DUREE_SESSION_MS = 10 * 60 * 60_000

// ---------- Mots de passe (Argon2id, réglages recommandés par OWASP) ----------

export const hacherMotDePasse = (motDePasse: string) => hash(motDePasse)

export async function verifierMotDePasse(empreinte: string, motDePasse: string): Promise<boolean> {
  try {
    return await verify(empreinte, motDePasse)
  } catch {
    return false
  }
}

/**
 * Empreinte factice, vérifiée quand l'e-mail est inconnu : la réponse prend alors le même temps
 * que pour un vrai compte, ce qui empêche de deviner quelles adresses ont un compte.
 */
const EMPREINTE_FACTICE = hash(randomBytes(16).toString('hex'))

export function erreurMotDePasse(motDePasse: string): string | undefined {
  if (motDePasse.length < MOT_DE_PASSE_LONGUEUR_MIN) {
    return `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_LONGUEUR_MIN} caractères.`
  }
  if (motDePasse.length > 200) return 'Le mot de passe est trop long (200 caractères maximum).'
  return undefined
}

/** Utilisateur actif dont le mot de passe correspond, sinon null (sans dire ce qui ne va pas). */
export async function authentifier(prisma: PrismaClient, email: string, motDePasse: string) {
  const utilisateur = await prisma.utilisateur.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!utilisateur || !utilisateur.actif) {
    await verifierMotDePasse(await EMPREINTE_FACTICE, motDePasse)
    return null
  }
  return (await verifierMotDePasse(utilisateur.motDePasseHash, motDePasse)) ? utilisateur : null
}

// ---------- Sessions ----------

/** La base ne garde que l'empreinte du jeton. */
export const empreinteJeton = (jeton: string) => createHash('sha256').update(jeton).digest('hex')

/** Crée une session et renvoie le jeton à placer dans le cookie (256 bits aléatoires). */
export async function ouvrirSession(prisma: PrismaClient, utilisateurId: string, maintenant: Date): Promise<string> {
  const jeton = randomBytes(32).toString('base64url')
  // Ménage au passage : sessions expirées de tous les utilisateurs.
  await prisma.session.deleteMany({ where: { expireLe: { lt: maintenant } } })
  await prisma.session.create({
    data: { id: empreinteJeton(jeton), utilisateurId, creeLe: maintenant, expireLe: new Date(maintenant.getTime() + DUREE_SESSION_MS) },
  })
  return jeton
}

/** Utilisateur de la session, si elle existe, n'a pas expiré et que le compte est actif. */
export async function lireSession(prisma: PrismaClient, jeton: string, maintenant: Date): Promise<UtilisateurConnecte | null> {
  const session = await prisma.session.findUnique({ where: { id: empreinteJeton(jeton) }, include: { utilisateur: true } })
  if (!session || session.expireLe <= maintenant || !session.utilisateur.actif) return null
  const { id, email, nom, role } = session.utilisateur
  return { id, email, nom, role }
}

export async function fermerSession(prisma: PrismaClient, jeton: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: empreinteJeton(jeton) } })
}

/** Ferme toutes les sessions d'un utilisateur sauf, éventuellement, celle en cours (changement de mot de passe). */
export async function fermerAutresSessions(prisma: PrismaClient, utilisateurId: string, jetonConserve?: string) {
  await prisma.session.deleteMany({
    where: { utilisateurId, ...(jetonConserve ? { id: { not: empreinteJeton(jetonConserve) } } : {}) },
  })
}
