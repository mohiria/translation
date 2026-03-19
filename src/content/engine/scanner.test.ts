
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scanAndHighlight, clearHighlights } from './scanner'
import { ProficiencyLevel } from '../../common/types'

describe('scanner - Smart Filtering', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <nav id="nav-area">
        <p>This should be ignored (apple)</p>
      </nav>
      <header id="header-area">
        <p>This should be ignored (banana)</p>
      </header>
      <main id="main-content">
        <p id="target-p">This should be highlighted (apple)</p>
        <aside>
          <p>This side-bar text should be ignored (cherry)</p>
        </aside>
      </main>
      <footer id="footer-area">
        <p>This should be ignored (apple)</p>
      </footer>
    `
  })

  it('should ignore text in nav, header, footer and aside tags', async () => {
    const mockDict = {
      'apple': { meaning: '苹果', ipa: 'ˈæpl' },
      'banana': { meaning: '香蕉', ipa: 'bəˈnɑːnə' },
      'cherry': { meaning: '樱桃', ipa: 'ˈtʃeri' }
    } as any

    await scanAndHighlight(
      document.body,
      'CEFR_A1',
      new Set(),
      mockDict,
      'US',
      undefined,
      false,
      true
    )

    // Main content should have highlights
    const mainP = document.getElementById('target-p')
    expect(mainP?.querySelector('.ll-word-container')).not.toBeNull()

    // Nav/Header/Footer/Aside should NOT have highlights
    const nav = document.getElementById('nav-area')
    const header = document.getElementById('header-area')
    const footer = document.getElementById('footer-area')
    const aside = document.querySelector('aside')

    expect(nav?.querySelector('.ll-word-container')).toBeNull()
    expect(header?.querySelector('.ll-word-container')).toBeNull()
    expect(footer?.querySelector('.ll-word-container')).toBeNull()
    expect(aside?.querySelector('.ll-word-container')).toBeNull()
  })

  it('should continue to show translations after gaps (no global limit)', async () => {
    document.body.innerHTML = `
      <div id="test-freq">
        <p>apple 1</p> <p>g1</p> <p>g2</p>
        <p>apple 2</p> <p>g3</p> <p>g4</p>
        <p>apple 3</p> <p>g5</p> <p>g6</p>
        <p>apple 4</p> <p>g7</p> <p>g8</p>
        <p>apple 5</p>
      </div>
    `
    const mockDict = { 'apple': { meaning: '苹果', ipa: 'ˈæpl' } } as any
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)

    const containers = Array.from(document.querySelectorAll('.ll-word-container[data-word="apple"]'))
    const translations = containers.map(c => c.querySelector('.ll-translation')?.textContent || '')
    
    // All 5 should show because gaps are respected and there's no max limit
    expect(translations[0]).toContain('苹果')
    expect(translations[1]).toContain('苹果')
    expect(translations[2]).toContain('苹果')
    expect(translations[3]).toContain('苹果')
    expect(translations[4]).toContain('苹果')
  })

  it('should implement Spaced Reinforcement (skip 2 paragraphs)', async () => {
    document.body.innerHTML = `
      <div id="spaced-test">
        <p id="p1">apple (1st - show)</p>
        <p id="p2">apple (Gap 1 - hide)</p>
        <p id="p3">apple (Gap 2 - hide)</p>
        <p id="p4">apple (Gap met - show refresh #2)</p>
        <p id="p5">apple (Gap 1 - hide)</p>
        <p id="p6">apple (Gap 2 - hide)</p>
        <p id="p7">apple (Gap met - show refresh #3)</p>
      </div>
    `
    const mockDict = { 'apple': { meaning: '苹果', ipa: 'ˈæpl' } } as any
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)

    const getPTranslation = (id: string) => {
      const container = document.getElementById(id)?.querySelector('.ll-word-container')
      return container?.querySelector('.ll-translation')?.textContent || ''
    }

    expect(getPTranslation('p1')).toContain('苹果')
    expect(getPTranslation('p2')).toBe('')
    expect(getPTranslation('p3')).toBe('')
    expect(getPTranslation('p4')).toContain('苹果')
    expect(getPTranslation('p5')).toBe('')
    expect(getPTranslation('p6')).toBe('')
    expect(getPTranslation('p7')).toContain('苹果')
  })
})
