// Vérifie que chaque média référencé existe sur le disque et porte un crédit complet.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PHOTOS_PROGRAMME, TOUS_LES_MEDIAS, VIDEO_TAS_DE_POIS } from './medias'
import { SEJOUR_BRETAGNE_SAUVAGE } from './sejour'

const PUBLIC = path.resolve(__dirname, '../../public')

describe('médias', () => {
  it.each(TOUS_LES_MEDIAS.map((m) => [m.id, m] as const))('%s : fichiers présents, alt et crédit renseignés', (_id, m) => {
    expect(fs.existsSync(path.join(PUBLIC, m.src.l))).toBe(true)
    expect(fs.existsSync(path.join(PUBLIC, m.src.s))).toBe(true)
    expect(m.alt.length).toBeGreaterThan(15)
    expect(m.credit.auteur).not.toBe('')
    expect(m.credit.licence).toMatch(/^(CC0|CC BY(-SA)? \d\.\d)$/)
    expect(m.credit.source).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
    expect(m.credit.urlLicence).toMatch(/^https:\/\/creativecommons\.org\//)
  })

  it('la vidéo est présente', () => {
    expect(fs.existsSync(path.join(PUBLIC, VIDEO_TAS_DE_POIS.src))).toBe(true)
  })

  it('une photo par journée du programme', () => {
    for (const j of SEJOUR_BRETAGNE_SAUVAGE.programme) expect(PHOTOS_PROGRAMME[j.jour]).toBeDefined()
  })

  it('identifiants uniques', () => {
    const ids = TOUS_LES_MEDIAS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
