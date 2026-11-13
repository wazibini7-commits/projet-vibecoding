import { describe, expect, it } from 'vitest'
import { lireRoute } from './navigation'

describe('lireRoute', () => {
  it.each([
    ['', { page: 'accueil' }],
    ['#/', { page: 'accueil' }],
    ['#/demande', { page: 'demande' }],
    ['#/demande/', { page: 'demande' }],
    ['#/inconnue', { page: 'accueil' }],
    ['#programme', { page: 'accueil', ancre: 'programme' }],
    ['#galerie', { page: 'accueil', ancre: 'galerie' }],
    ['#/admin', { page: 'admin', chemin: '/' }],
    ['#/admin/', { page: 'admin', chemin: '/' }],
    ['#/admin/departs', { page: 'admin', chemin: '/departs' }],
    ['#/admin/demandes/VL-2027-0001', { page: 'admin', chemin: '/demandes/VL-2027-0001' }],
    ['#/administration', { page: 'accueil' }],
    ['#/suivi', { page: 'suivi', chemin: '/' }],
    ['#/suivi/VL-2027-0001/abc_123-XYZ', { page: 'suivi', chemin: '/VL-2027-0001/abc_123-XYZ' }],
  ])('%s', (hash, attendu) => {
    expect(lireRoute(hash)).toEqual(attendu)
  })
})
