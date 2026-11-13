// Crée (ou réinitialise) un compte du back-office. Aucun compte n'existe par défaut : pas de mot de passe connu.
//
//   npm run utilisateur:creer -- --email prenom@vanlife.example --nom "Prénom Nom" [--role ADMIN|GESTIONNAIRE]
//
// Le mot de passe est demandé dans le terminal (deux fois, sans s'afficher).
// Sans terminal interactif : variable d'environnement VANLIFE_MOT_DE_PASSE.
// Si le compte existe déjà, son mot de passe et son rôle sont remplacés et ses sessions fermées.
import '../src/config' // charge .env
import { createInterface } from 'node:readline'
import { parseArgs } from 'node:util'
import { PrismaClient } from '@prisma/client'
import { erreurMotDePasse, fermerAutresSessions, hacherMotDePasse } from '../src/auth/securite'
import { LIBELLES_ROLE, type Role } from '../../src/domain/admin'

const { values } = parseArgs({
  options: { email: { type: 'string' }, nom: { type: 'string' }, role: { type: 'string', default: 'ADMIN' } },
})

function arreter(message: string): never {
  console.error(`✘ ${message}`)
  process.exit(1)
}

/** Question dont la réponse ne s'affiche pas à l'écran. */
function demanderCache(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    const ecrire = (rl as unknown as { _writeToOutput: (s: string) => void })
    let premier = true
    ecrire._writeToOutput = (s: string) => {
      if (premier) { process.stdout.write(s); premier = false } // affiche la question, pas la saisie
    }
    rl.question(question, (reponse) => {
      rl.close()
      process.stdout.write('\n')
      resolve(reponse)
    })
  })
}

const email = values.email?.trim().toLowerCase()
const nom = values.nom?.trim()
const role = values.role?.toUpperCase() as Role
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) arreter('Indiquez une adresse e-mail valide : --email prenom@exemple.fr')
if (!nom) arreter('Indiquez un nom : --nom "Prénom Nom"')
if (!(role in LIBELLES_ROLE)) arreter('Rôle inconnu : --role ADMIN ou --role GESTIONNAIRE')

let motDePasse = process.env.VANLIFE_MOT_DE_PASSE
if (!motDePasse) {
  if (!process.stdin.isTTY) arreter('Terminal non interactif : fournissez le mot de passe dans VANLIFE_MOT_DE_PASSE.')
  motDePasse = await demanderCache('Mot de passe (12 caractères minimum) : ')
  if ((await demanderCache('Confirmez le mot de passe : ')) !== motDePasse) arreter('Les deux mots de passe sont différents.')
}
const erreur = erreurMotDePasse(motDePasse)
if (erreur) arreter(erreur)

const prisma = new PrismaClient()
try {
  const motDePasseHash = await hacherMotDePasse(motDePasse)
  const existant = await prisma.utilisateur.findUnique({ where: { email } })
  const u = await prisma.utilisateur.upsert({
    where: { email },
    create: { email, nom, role, motDePasseHash },
    update: { nom, role, motDePasseHash, actif: true },
  })
  if (existant) await fermerAutresSessions(prisma, u.id)
  console.log(`✔ Compte ${existant ? 'mis à jour' : 'créé'} : ${u.nom} <${u.email}> — ${LIBELLES_ROLE[u.role]}`)
  console.log('  Connexion : http://localhost:5173/#/admin')
} finally {
  await prisma.$disconnect()
}
