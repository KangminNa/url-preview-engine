import { describe, expect, it } from 'vitest'

import {
  ContentProfile,
  createContentProfileRegistry,
} from '../../src/content'

describe('content profile registry', () => {
  it('resolves built-in rules for naver map', () => {
    const registry = createContentProfileRegistry()
    const rules = registry.resolve(
      new URL('https://map.naver.com/p/smart-around/place/1827136953'),
      'naver',
    )

    expect(rules.focusTitleNearestBody).toBe(true)
    expect(rules.mainSelectors?.length).toBeGreaterThan(0)
    expect(rules.noiseKeywords?.includes('광고')).toBe(true)
  })

  it('applies custom profile with higher priority', () => {
    class CustomProfile extends ContentProfile {
      public constructor() {
        super('custom', 999)
      }

      public matches(): boolean {
        return true
      }

      public resolveRules() {
        return {
          focusTitleNearestBody: false,
          mainSelectors: ['.custom-root'],
          mainKeywords: ['custom-main'],
        }
      }
    }

    const registry = createContentProfileRegistry([new CustomProfile()])
    const rules = registry.resolve(
      new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      'youtube',
    )

    expect(rules.focusTitleNearestBody).toBe(false)
    expect(rules.mainSelectors?.includes('.custom-root')).toBe(true)
    expect(rules.mainKeywords?.includes('custom-main')).toBe(true)
  })
})
