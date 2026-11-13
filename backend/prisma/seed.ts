// Remplissage de la base (« seed ») : npm run db:seed
// - Séjour Bretagne Sauvage : repris TEL QUEL du frontend (src/data/sejour.ts), source unique du contenu.
// - Départs : chaque samedi de la saison 2027 (avril → octobre), 2 vans par départ — HYPOTHÈSE à valider par Vanlife.
// - Quelques demandes FICTIVES (e-mails @exemple.fr) pour tester les étapes suivantes (API, back-office).
// Le script peut être relancé sans créer de doublons.
import { PrismaClient, StatutDemande, TypePrestation } from '@prisma/client'
import { SEJOUR_BRETAGNE_SAUVAGE as S } from '../../src/data/sejour'

const prisma = new PrismaClient()

/** Date calendaire « AAAA-MM-JJ » → Date à minuit UTC (stockée en type DATE). */
const jour = (iso: string) => new Date(`${iso}T00:00:00Z`)
const ajouterJours = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)

/** Tous les samedis entre deux dates incluses. */
function samedis(debut: string, fin: string): Date[] {
  const resultat: Date[] = []
  let d = jour(debut)
  while (d.getUTCDay() !== 6) d = ajouterJours(d, 1)
  for (; d <= jour(fin); d = ajouterJours(d, 7)) resultat.push(d)
  return resultat
}

async function seedSejour() {
  const donnees = {
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
    devise: S.prix.devise,
    prixAConfirmer: S.prix.aConfirmer,
    elementsAConfirmer: S.elementsAConfirmer,
    publie: true,
  }
  await prisma.sejour.upsert({ where: { id: S.id }, create: { id: S.id, ...donnees }, update: donnees })

  // Programme et prestations : remplacés entièrement pour rester alignés sur sejour.ts.
  await prisma.$transaction([
    prisma.jourProgramme.deleteMany({ where: { sejourId: S.id } }),
    prisma.prestation.deleteMany({ where: { sejourId: S.id } }),
    prisma.jourProgramme.createMany({
      data: S.programme.map((j) => ({ sejourId: S.id, jour: j.jour, titre: j.titre, description: j.description })),
    }),
    prisma.prestation.createMany({
      data: [
        ...S.prestationsIncluses.map((libelle, ordre) => ({ sejourId: S.id, type: TypePrestation.INCLUSE, libelle, ordre })),
        ...S.depensesAPrevoir.map((libelle, ordre) => ({ sejourId: S.id, type: TypePrestation.A_PREVOIR, libelle, ordre })),
      ],
    }),
  ])
}

async function seedDeparts() {
  const dates = samedis('2027-04-01', '2027-10-31')
  await prisma.depart.createMany({
    data: dates.map((date) => ({ sejourId: S.id, date, capacite: 2 })),
    skipDuplicates: true,
  })
  return dates.length
}

const DEMANDES_FICTIVES = [
  { reference: 'VL-DEMO-0001', prenom: 'Camille', nom: 'Exemple', email: 'camille@exemple.fr', depart: '2027-05-15', statut: StatutDemande.RECUE },
  { reference: 'VL-DEMO-0002', prenom: 'Louis', nom: 'Test', email: 'louis@exemple.fr', depart: '2027-06-12', statut: StatutDemande.EN_ETUDE },
  { reference: 'VL-DEMO-0003', prenom: 'Inès', nom: 'Démo', email: 'ines@exemple.fr', depart: '2027-07-03', statut: StatutDemande.CONFIRMEE },
] as const

/** Chemin de statuts parcouru pour arriver au statut final (pour un historique cohérent). */
const CHEMIN: Record<StatutDemande, StatutDemande[]> = {
  RECUE: ['RECUE'],
  EN_ETUDE: ['RECUE', 'EN_ETUDE'],
  CONFIRMEE: ['RECUE', 'EN_ETUDE', 'CONFIRMEE'],
  REFUSEE: ['RECUE', 'EN_ETUDE', 'REFUSEE'],
  ANNULEE: ['RECUE', 'ANNULEE'],
}

async function seedDemandesFictives() {
  for (const d of DEMANDES_FICTIVES) {
    if (await prisma.demande.findUnique({ where: { reference: d.reference } })) continue
    const depart = await prisma.depart.findUniqueOrThrow({ where: { sejourId_date: { sejourId: S.id, date: jour(d.depart) } } })
    const client = await prisma.client.upsert({
      where: { email: d.email },
      create: { prenom: d.prenom, nom: d.nom, email: d.email, consentementRgpdLe: new Date() },
      update: {},
    })
    const chemin = CHEMIN[d.statut]
    await prisma.demande.create({
      data: {
        reference: d.reference,
        clientId: client.id,
        departId: depart.id,
        dateRetour: ajouterJours(depart.date, S.duree.jours - 1),
        nombreVoyageurs: S.nombreVoyageurs,
        prixCentimes: S.prix.montant * 100,
        message: 'Demande fictive créée par le script de remplissage.',
        statut: d.statut,
        historique: {
          create: chemin.map((statut, i) => ({ ancienStatut: i === 0 ? null : chemin[i - 1], nouveauStatut: statut })),
        },
      },
    })
  }
}

async function main() {
  await seedSejour()
  const nbDeparts = await seedDeparts()
  await seedDemandesFictives()
  const [sejours, jours, prestations, departs, demandes] = await Promise.all([
    prisma.sejour.count(), prisma.jourProgramme.count(), prisma.prestation.count(),
    prisma.depart.count(), prisma.demande.count(),
  ])
  console.log(`Séjours : ${sejours} · jours de programme : ${jours} · prestations : ${prestations}`)
  console.log(`Départs : ${departs} (${nbDeparts} samedis de la saison 2027) · demandes fictives : ${demandes}`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
