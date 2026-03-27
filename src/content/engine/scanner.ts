import { analyzeText } from '../../common/nlp/analyzer'
import { ProficiencyLevel, WordExplanation } from '../../common/types'
import { speak } from '../../common/utils/speech'

/**
 * Constants & Configuration
 */
const REFRESH_GAP = 2 // Increased sensitivity: show word more frequently (every 2nd block instead of 4th)

/**
 * Elements and Roles that should be skipped entirely (including their children).
 * These are terminal UI elements or hidden areas that never contain readable prose.
 */
const SKIP_SELECTOR = [
  'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'CODE', 'PRE', 
  'NAV', 'BUTTON', 'LABEL', 'SELECT', 'OPTION', 'FIELDSET', 'LEGEND',
  'KBD', 'SAMP', 'VAR', 'TIME', 'DATA', 'SVG', 'CANVAS', 'MATH',
  'SUMMARY', 'DIALOG', 'MENU',
  '[role="navigation"]', '[role="button"]', '[role="menu"]', '[role="tablist"]', 
  '[role="tab"]', '[role="tooltip"]', '[role="status"]', '[role="alert"]',
  '[aria-hidden="true"]'
].join(', ')

/**
 * Heuristic check if an element is likely part of a Navigation/UI area.
 */
const isLikelyUI = (el: HTMLElement): boolean => {
  const text = el.textContent || ''
  const trimmedText = text.trim()
  if (!trimmedText) return false

  const totalLen = trimmedText.length
  const links = el.querySelectorAll('a')
  let linkTextLen = 0
  links.forEach(a => { linkTextLen += (a.textContent?.trim().length || 0) })
  
  // Link Density: How much of the text is wrapped in <a> tags?
  const linkDensity = totalLen > 0 ? linkTextLen / totalLen : 0
  
  // Punctuation check: Real prose has sentences.
  const hasPunctuation = /[.,!?;\uff0c\u3002\uff1f\uff01\uff1b]/.test(trimmedText)

  // 1. High-Confidence UI Identification (Navigation/Menus/Lists)
  // If it's mostly links and doesn't look like a sentence, it's UI.
  // We use a slightly lower threshold (0.4) to be safer against nav lists.
  if (linkDensity > 0.4 && !hasPunctuation && totalLen < 2000) {
    return true
  }

  // 2. High-Confidence Prose Identification
  // If it's long enough, has punctuation, and isn't dominated by links, it's content.
  if (totalLen > 40 && hasPunctuation && linkDensity < 0.4) {
    return false 
  }

  // 3. Specific UI Patterns (Keywords + Length)
  const className = el.className.toString().toLowerCase()
  const uiKeywords = ['sidebar', 'nav-', 'navbar', 'menu-', 'toc-', 'breadcrumb', 'pagination', 'header', 'footer']
  if (uiKeywords.some(key => className.includes(key))) {
    // UI-named containers without prose features are skipped.
    if (totalLen < 200 && !hasPunctuation) return true
  }

  // 4. Fallback for very short terminal items (e.g., "Home", "Next")
  if (totalLen < 40 && linkDensity > 0.7) return true

  return false
}

/**
 * Heading tags are usually ignored to preserve layout, but we allow them if they are deep inside content.
 */
const HEADER_SELECTOR = 'H1, H2, H3, H4, H5, H6, [role="heading"]'

interface WordState {
  totalDisplayed: number
  lastBlockIndex: number
}

/**
 * Creates an optimized TreeWalker that prunes ignored subtrees.
 */
const createOptimizedWalker = (root: HTMLElement | Document, extraReject?: (el: HTMLElement) => boolean) => {
  return document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        // 1. Hard skip for non-content UI
        if (el.matches(SKIP_SELECTOR) || el.isContentEditable || (extraReject && extraReject(el))) {
          return NodeFilter.FILTER_REJECT
        }
        
        // 2. Heuristic check for UI containers
        if (isLikelyUI(el)) {
          return NodeFilter.FILTER_REJECT
        }

        // 3. Skip headings to preserve layout/structure
        if (el.matches(HEADER_SELECTOR)) {
          return NodeFilter.FILTER_REJECT
        }

        return NodeFilter.FILTER_SKIP
      }
      return NodeFilter.FILTER_ACCEPT
    }
  })
}

/**
 * Main entry point for scanning and highlighting
 */
export const scanAndHighlight = async (
  root: HTMLElement | Document, 
  level: ProficiencyLevel, 
  vocabulary: Set<string> = new Set(),
  userDict: Record<string, WordExplanation> = {},
  pronunciation: 'UK' | 'US' = 'US',
  dbLookup?: (words: string[]) => Promise<Record<string, WordExplanation>>,
  shouldClear: boolean = false,
  showIPA: boolean = true
) => {
  if (shouldClear) clearHighlights(root)

  // 1. Collect all candidates for batch lookup
  const candidates: Set<string> = new Set()
  const candidateWalker = createOptimizedWalker(root)
  
  while (candidateWalker.nextNode()) {
    const text = candidateWalker.currentNode.nodeValue || ''
    const matches = text.match(/\b[a-zA-Z]{3,}\b/g)
    matches?.forEach(w => candidates.add(w.toLowerCase()))
  }

  // 2. Batch fetch dictionary data
  let combinedDict = { ...userDict }
  if (dbLookup && candidates.size > 0) {
    const missing = Array.from(candidates).filter(w => !combinedDict[w])
    if (missing.length > 0) {
      const dbResults = await dbLookup(missing).catch(() => ({}))
      combinedDict = { ...combinedDict, ...dbResults }
    }
  }

  // 3. Identification and Reinforcement Logic
  const walker = createOptimizedWalker(root, (el) => el.classList.contains('ll-word-container'))

  const blockMap = new Map<Element, Text[]>()
  const blocks: Element[] = []

  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const block = node.parentElement?.closest('p, li') || 
                  node.parentElement?.closest('div, section, article') || 
                  node.parentElement
    if (block) {
      if (!blockMap.has(block)) {
        blockMap.set(block, [])
        blocks.push(block)
      }
      blockMap.get(block)?.push(node)
    }
  }

  const wordStateMap = new Map<string, WordState>()

  blocks.forEach((block, blockIndex) => {
    const seenInBlock = new Set<string>()
    blockMap.get(block)?.forEach(node => {
      processTextNode(node, level, vocabulary, combinedDict, pronunciation, showIPA, wordStateMap, blockIndex, seenInBlock)
    })
  })
}

/**
 * Process a single text node with Spaced Reinforcement
 */
const processTextNode = (
  node: Text, 
  level: ProficiencyLevel, 
  vocabulary: Set<string>,
  dict: Record<string, WordExplanation>,
  pronunciation: 'UK' | 'US',
  showIPA: boolean,
  stateMap: Map<string, WordState>,
  blockIndex: number,
  seenInBlock: Set<string>
) => {
  const text = node.nodeValue
  if (!text?.trim()) return

  const matches = analyzeText(text, level, vocabulary, dict, pronunciation)
  if (matches.length === 0) return

  const fragment = document.createDocumentFragment()
  let lastIndex = 0

  matches.forEach(match => {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
    }

    const word = match.word
    const lowerWord = word.toLowerCase()
    const state = stateMap.get(lowerWord) || { totalDisplayed: 0, lastBlockIndex: -1 }
    
    const isFirstInBlock = !seenInBlock.has(lowerWord)
    const hasMetGap = state.lastBlockIndex === -1 || (blockIndex - state.lastBlockIndex >= REFRESH_GAP)
    
    if (isFirstInBlock && hasMetGap) {
      state.totalDisplayed++
      state.lastBlockIndex = blockIndex
      stateMap.set(lowerWord, state)
      fragment.appendChild(createWordContainer(match, pronunciation, showIPA))
    } else {
      fragment.appendChild(document.createTextNode(word))
    }

    seenInBlock.add(lowerWord)
    lastIndex = match.index + match.length
  })

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
  }
  node.replaceWith(fragment)
}

/**
 * Creates the interactive translation UI element
 */
const createWordContainer = (match: any, pronunciation: string, showIPA: boolean): HTMLElement => {
  const container = document.createElement('span')
  container.className = 'll-word-container'
  container.setAttribute('data-word', match.word.toLowerCase())
  container.setAttribute('contenteditable', 'false')
  
  const exp = match.explanation
  const shouldHideIPA = exp.hideIPA

  // Base Styles
  Object.assign(container.style, {
    backgroundColor: 'rgba(75, 139, 245, 0)',
    borderRadius: '3px',
    padding: '1px 2px',
    margin: '0 1px',
    display: 'inline',
    transition: 'all 0.4s ease',
    cursor: 'pointer',
    borderBottom: '1px solid transparent'
  })

  // Fade-in animation
  setTimeout(() => {
    container.style.backgroundColor = 'rgba(75, 139, 245, 0.15)'
    container.style.borderBottom = '1px solid rgba(75, 139, 245, 0.3)'
  }, 10)

  // Word Span
  const span = document.createElement('span')
  span.className = 'll-word'
  span.textContent = match.word
  span.style.fontWeight = 'bold'
  span.style.color = 'inherit'
  span.onclick = (e) => e.stopPropagation()
  container.appendChild(span)

  // Voice Icon (Refined Two-Arc Style)
  if (!shouldHideIPA) {
    const voiceBtn = document.createElement('span')
    voiceBtn.className = 'll-voice-btn'
    voiceBtn.setAttribute('aria-hidden', 'true')
    voiceBtn.style.cssText = 'user-select:none; margin-left:4px; display:inline-flex; align-items:center; cursor:pointer; padding:2px; vertical-align:middle;'
    
    voiceBtn.innerHTML = `
      <svg class="youdao-voice-svg" viewBox="0 0 1024 1024" width="14" height="14">
        <rect class="source" x="256" y="384" width="64" height="256" rx="32" fill="#a1a1a1" />
        <path class="wave wave-1" d="M448 320c48 0 96 85.3 96 192s-48 192-96 192" stroke="#a1a1a1" stroke-width="80" fill="none" stroke-linecap="round" />
        <path class="wave wave-2" d="M608 192c80 0 160 143.3 160 320s-80 320-160 320" stroke="#a1a1a1" stroke-width="80" fill="none" stroke-linecap="round" />
      </svg>
      <style>
        @keyframes voiceWaveFade {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        .ll-voice-btn:hover .source { fill: #4b8bf5; }
        .ll-voice-btn:hover .wave { stroke: #4b8bf5; }
        .ll-voice-btn.playing .source { fill: #4b8bf5; }
        .ll-voice-btn.playing .wave { stroke: #4b8bf5; }
        .ll-voice-btn.playing .wave-1 { animation: voiceWaveFade 0.6s infinite; }
        .ll-voice-btn.playing .wave-2 { animation: voiceWaveFade 0.6s infinite 0.2s; }
      </style>
    `
    
    voiceBtn.onclick = (e) => {
      e.stopPropagation()
      voiceBtn.classList.add('playing')
      speak(match.word, pronunciation === 'UK' ? 'en-GB' : 'en-US')
      setTimeout(() => voiceBtn.classList.remove('playing'), 1200)
    }
    container.appendChild(voiceBtn)
  }

  // Translation Span
  const translation = document.createElement('span')
  translation.className = 'll-translation'
  translation.setAttribute('aria-hidden', 'true')
  translation.style.userSelect = 'none'
  
  const ipaPart = (!shouldHideIPA && showIPA && exp.ipa) ? `${exp.ipa}` : ''
  const separator = ipaPart ? ' · ' : ''
  
  translation.textContent = ` (${ipaPart}${separator}${exp.meaning})`
  Object.assign(translation.style, {
    color: '#666',
    fontSize: '0.8em',
    marginLeft: '4px',
    fontWeight: 'normal',
    opacity: '0.7',
    whiteSpace: 'nowrap'
  })
  
  container.appendChild(translation)
  return container
}

/**
 * Utility: Clear highlights
 */
export const clearHighlights = (root: HTMLElement | Document = document) => {
  const highlights = root.querySelectorAll('.ll-word-container')
  const parents = new Set<ParentNode>()

  highlights.forEach(el => {
    const wordSpan = el.querySelector('.ll-word')
    const parent = el.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(wordSpan?.textContent || ''), el)
      parents.add(parent as ParentNode)
    }
  })
  parents.forEach(p => p.normalize())
}

/**
 * Utility: Unhighlight specific word
 */
export const unhighlightWord = (word: string, root: HTMLElement | Document = document) => {
  const highlights = root.querySelectorAll(`.ll-word-container[data-word="${word.toLowerCase()}"]`)
  const parents = new Set<ParentNode>()

  highlights.forEach(el => {
    const wordSpan = el.querySelector('.ll-word')
    const parent = el.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(wordSpan?.textContent || ''), el)
      parents.add(parent as ParentNode)
    }
  })
  parents.forEach(p => p.normalize())
}

/**
 * Helper: Create standard TreeWalker
 */
const createWalker = (root: HTMLElement | Document, rejectFn: (node: Node) => boolean) => {
  return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => rejectFn(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  })
}
