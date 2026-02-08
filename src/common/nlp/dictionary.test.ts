import { describe, it, expect } from 'vitest'
import { isDifficultyAbove } from './dictionary'
import { ProficiencyLevel } from '../types'

describe('Dictionary Difficulty Logic', () => {
  it('should show high-level words to a beginner (CEFR_A1)', () => {
    // 'proficiency' is CET6/B2 level. An A1 user should definitely see it.
    expect(isDifficultyAbove('proficiency', 'CEFR_A1')).toBe(true)
  })

  it('should NOT show low-level words to an advanced user (CEFR_C1)', () => {
    // 'browser' is CEFR_A1 level. A C1 user does not need to see it.
    expect(isDifficultyAbove('browser', 'CEFR_C1')).toBe(false)
  })

  it('should handle case insensitivity', () => {
    expect(isDifficultyAbove('PROficiency', 'CEFR_A1')).toBe(true)
  })

  it('should return false for unknown words', () => {
    expect(isDifficultyAbove('nonexistentwordxyz', 'CEFR_A1')).toBe(false)
  })
})
