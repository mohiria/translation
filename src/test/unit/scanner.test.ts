
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { scanAndHighlight, unhighlightWord } from '../../content/engine/scanner'

describe('Scanner Unit Tests - Smart Filtering & Reinforcement', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('should ignore restricted tags like H1 and KBD', async () => {
    document.body.innerHTML = `
      <h1>Heading (apple)</h1>
      <p id="target">Paragraph (apple)</p>
      <kbd>Key (apple)</kbd>
    `
    const mockDict = { 'apple': { meaning: '苹果', ipa: 'ˈæpl' } } as any
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)

    expect(document.querySelector('h1')?.querySelector('.ll-word-container')).toBeNull()
    expect(document.querySelector('kbd')?.querySelector('.ll-word-container')).toBeNull()
    expect(document.getElementById('target')?.querySelector('.ll-word-container')).not.toBeNull()
  })

  it('should implement Spaced Reinforcement (skip 1 paragraph)', async () => {
    document.body.innerHTML = `
      <p id="p1">apple (show)</p>
      <p id="p2">apple (skip 1)</p>
      <p id="p3">apple (refresh show)</p>
      <p id="p4">apple (skip 2)</p>
    `
    const mockDict = { 'apple': { meaning: '苹果', ipa: 'ˈæpl' } } as any
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)

    const getT = (id: string) => document.getElementById(id)?.querySelector('.ll-translation')?.textContent || ''

    expect(getT('p1')).toContain('苹果')
    expect(getT('p2')).toBe('')
    expect(getT('p3')).toContain('苹果')
    expect(getT('p4')).toBe('')
  })

  it('should not show US/UK prefix in on-page translations', async () => {
    document.body.innerHTML = '<p id="target">apple</p>'
    const mockDict = { 'apple': { meaning: '苹果', ipa: 'ˈæpl' } } as any
    
    // Test with US
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict, 'US')
    let translation = document.querySelector('.ll-translation')?.textContent || ''
    expect(translation).toContain('ˈæpl')
    expect(translation).not.toContain('US ')
    expect(translation).not.toContain('UK ')

    // Test with UK
    document.body.innerHTML = '<p id="target">apple</p>'
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict, 'UK')
    translation = document.querySelector('.ll-translation')?.textContent || ''
    expect(translation).toContain('ˈæpl')
    expect(translation).not.toContain('US ')
    expect(translation).not.toContain('UK ')
  })

  it('should unhighlight specific words correctly', async () => {
    document.body.innerHTML = '<p>apple pie</p>'
    const mockDict = { 'apple': { meaning: '苹果' } } as any
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)

    expect(document.querySelector('.ll-word-container')).not.toBeNull()
    unhighlightWord('apple', document.body)
    expect(document.querySelector('.ll-word-container')).toBeNull()
    expect(document.body.textContent).toBe('apple pie')
  })
})
