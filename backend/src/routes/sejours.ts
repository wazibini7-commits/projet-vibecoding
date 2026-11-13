import type { FastifyInstance } from 'fastify'
import { aujourdhuiIso } from '../../../src/utils/dates'
import { listerDeparts, listerSejours, lireSejour } from '../services/sejours'
import type { OptionsApp } from '../app'

const parametresId = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', minLength: 1, maxLength: 100 } },
} as const

export async function routesSejours(app: FastifyInstance, { prisma, horloge }: OptionsApp) {
  app.get('/api/sejours', async () => listerSejours(prisma))

  app.get<{ Params: { id: string } }>('/api/sejours/:id', { schema: { params: parametresId } }, async (req, rep) => {
    const sejour = await lireSejour(prisma, req.params.id)
    if (!sejour) return rep.code(404).send({ message: 'Séjour introuvable.' })
    return sejour
  })

  app.get<{ Params: { id: string } }>('/api/sejours/:id/departs', { schema: { params: parametresId } }, async (req, rep) => {
    const departs = await listerDeparts(prisma, req.params.id, aujourdhuiIso(horloge()))
    if (!departs) return rep.code(404).send({ message: 'Séjour introuvable.' })
    return departs
  })
}
