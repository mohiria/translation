
import { describe, it, expect, beforeEach } from 'vitest'
import { scanAndHighlight } from './scanner'

describe('scanner - Real Site Simulation (Microsoft Learn)', () => {
  beforeEach(() => {
    // Mimic the actual structure identified by web_fetch
    document.body.innerHTML = `
      <header role="banner" class="header-holder">
        <nav role="navigation">
          <ul>
            <li>Documentation (extension)</li>
            <li>Training (extension)</li>
          </ul>
        </nav>
      </header>
      
      <div class="main-container">
        <nav class="sidebar" role="navigation">
          <div class="table-of-contents">
            <p>Getting Started (extension)</p>
            <p>Publish (extension)</p>
          </div>
        </nav>
        
        <main id="main" role="main">
          <article class="content">
            <h1>Publish a Microsoft Edge extension</h1>
            <p>An extension is a small program.</p>
            <p>Every extension must be published.</p>
            <p>This extension will be reviewed.</p>
            <p>The extension is ready for users.</p>
            <p>Finally, your extension is live.</p>
          </article>
        </main>
      </div>
      
      <footer role="contentinfo" class="footer-layout">
        <p>© 2026 Microsoft (extension)</p>
      </footer>
    `
  })

  it('should pass all UX optimization rules on MS Learn structure', async () => {
    const mockDict = {
      'extension': { meaning: '扩展', ipa: 'ɪkˈstenʃn' }
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

    // 1. Smart Filtering Check:
    // Header, Footer, and Sidebar should have NO word containers
    const header = document.querySelector('header')
    const footer = document.querySelector('footer')
    const sidebar = document.querySelector('.sidebar')
    
    expect(header?.querySelectorAll('.ll-word-container').length).toBe(0)
    expect(footer?.querySelectorAll('.ll-word-container').length).toBe(0)
    expect(sidebar?.querySelectorAll('.ll-word-container').length).toBe(0)

    // 2. Main Content Check:
    // Article should have word containers
    const article = document.querySelector('article')
    const containers = article?.querySelectorAll('.ll-word-container[data-word="extension"]') || []
    
    // In article, "extension" appears in <h1> and 5 <p> tags = 6 times
    expect(containers.length).toBe(6)

    // 3. Frequency Control Check:
    // Only the first 3 should have inline translation text
    const translations = Array.from(containers).map(c => c.querySelector('.ll-translation')?.textContent)
    
    expect(translations[0]).toContain('扩展') // 1st in <h1>
    expect(translations[1]).toContain('扩展') // 1st in <p>
    expect(translations[2]).toContain('扩展') // 2nd in <p>
    
    expect(translations[3]).toBe('') // 3rd in <p> (actually 4th occurrence total)
    expect(translations[4]).toBe('')
    expect(translations[5]).toBe('')

    // 4. Isolation Check:
    const firstTranslation = containers[0].querySelector('.ll-translation') as HTMLElement
    expect(firstTranslation.style.userSelect).toBe('none')
    expect(firstTranslation.getAttribute('aria-hidden')).toBe('true')
  })
})
