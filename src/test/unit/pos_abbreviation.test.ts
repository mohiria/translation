
import { describe, it, expect, beforeEach } from 'vitest'
import { scanAndHighlight } from '../../content/engine/scanner'

describe('POS Abbreviation in Scanner', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('should abbreviate full POS names in the inline translation', async () => {
    document.body.innerHTML = '<p id="target">apple</p>'
    const mockDict = { 
      'apple': { 
        meaning: 'noun, verb 苹果; noun 苹果树', 
        ipa: 'ˈæpl' 
      } 
    } as any
    
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict, 'US')
    const translation = document.querySelector('.ll-translation')?.textContent || ''
    
    // Expected abbreviation: noun -> n., verb -> v.
    // Based on user's request "verb显示为v", and confusion-map showing "v." or "n."
    // Let's assume the standard is "n.", "v.", "adj.", "adv." etc. 
    // to match confusion-map as closely as possible.
    expect(translation).toContain('n., v. 苹果')
    expect(translation).toContain('n. 苹果树')
    expect(translation).not.toContain('noun')
    expect(translation).not.toContain('verb')
  })

  it('should handle multiple POS correctly', async () => {
    document.body.innerHTML = '<p id="target">dummyword</p>'
    const mockDict = { 
      'dummyword': { 
        meaning: 'verb, noun 测试; adjective 测试的', 
        ipa: 'dummy' 
      } 
    } as any
    
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict, 'US')
    const translation = document.querySelector('.ll-translation')?.textContent || ''
    
    expect(translation).toContain('v., n. 测试')
    expect(translation).toContain('adj. 测试')
    expect(translation).not.toContain('adjective')
  })
})
