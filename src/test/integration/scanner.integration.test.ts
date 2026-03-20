
import { describe, it, expect, beforeEach } from 'vitest'
import { scanAndHighlight } from '../../content/engine/scanner'

describe('Scanner Integration - MS Learn Simulation', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header role="banner">
        <nav role="navigation">Documentation (extension)</nav>
      </header>
      <main role="main">
        <article>
          <h1>Publish extension</h1>
          <h2 id="h2-nested"><span>Nested extension title</span></h2>
          <div role="heading" aria-level="3">Heading Role extension</div>
          <p id="p1">An extension is a tool.</p>
          <p id="p2">One extension per user.</p>
          <p id="p3">This extension is good.</p>
          <p id="p4">Review the extension.</p>
          <p id="p5">Now the extension is live.</p>
        </article>
      </main>
      <footer>© 2026 extension</footer>
    `
  })

  it('should only translate in main article and respect memory gaps', async () => {
    const mockDict = { 'extension': { meaning: '扩展', ipa: 'ɪkˈstenʃn' } } as any
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)

    // 1. Check isolation: No translations in header/footer/h1
    expect(document.querySelector('header')?.querySelectorAll('.ll-word-container').length).toBe(0)
    expect(document.querySelector('footer')?.querySelectorAll('.ll-word-container').length).toBe(0)
    expect(document.querySelector('h1')?.querySelectorAll('.ll-word-container').length).toBe(0)
    expect(document.getElementById('h2-nested')?.querySelectorAll('.ll-word-container').length).toBe(0)
    expect(document.querySelector('[role="heading"]')?.querySelectorAll('.ll-word-container').length).toBe(0)

    // 2. Check spaced reinforcement (Skip 3 paragraphs between translations)
    const getT = (id: string) => document.getElementById(id)?.querySelector('.ll-translation')?.textContent || ''

    expect(getT('p1')).toContain('扩展') // 1st: Show
    expect(getT('p2')).toBe('')         // 2nd: Gap (REFRESH_GAP=2 means skip 1)
    expect(getT('p3')).toContain('扩展') // 3rd: Refresh Show
    expect(getT('p4')).toBe('')         // 4th: Gap
    expect(getT('p5')).toContain('扩展') // 5th: Refresh Show
  })
})
