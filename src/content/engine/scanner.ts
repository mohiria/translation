import { analyzeText } from '../../common/nlp/analyzer'
import { ProficiencyLevel, SavedWord, WordExplanation } from '../../common/types'
import { addToVocabulary } from '../../common/storage/vocabulary'
import { speak } from '../../common/utils/speech'
import { formatIPA } from '../../common/utils/format'

const IGNORE_TAGS = new Set([
  'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'CODE', 'PRE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
  'LABEL', 'SELECT', 'OPTION', 'FIELDSET', 'LEGEND',
  'KBD', 'SAMP', 'VAR', 'TIME', 'DATA',
  'SVG', 'CANVAS', 'MATH', 'SUMMARY', 'DIALOG'
])

const shouldIgnoreNode = (node: Node): boolean => {
  const parent = node.parentElement
  if (!parent) return true
  
  // 1. Basic tag blacklist
  if (IGNORE_TAGS.has(parent.tagName)) return true
  
  // 2. Content editable check
  if (parent.isContentEditable) return true

  // 3. Structural UI elements & ARIA roles (Smart Filtering)
  if (parent.closest(`
    nav, header, footer, aside, button, 
    [role="navigation"], [role="button"], [role="menu"], 
    [role="tablist"], [role="tab"], [role="tooltip"], 
    [role="status"], [role="alert"], [aria-hidden="true"]
  `)) {
    return true
  }

  return false
}

// Helper to extract candidate words (3+ letters) from text nodes
// This is a "pre-scan" to know what to query from DB
const extractCandidates = (text: string): string[] => {
  const matches = text.match(/\b[a-zA-Z]{3,}\b/g)
  return matches || []
}

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
  // 1. Collect all candidates first to minimize async gap
  const allCandidateWords: Set<string> = new Set()
  
  // We use a temporary walker to find candidates without disturbing the DOM
  const candidateWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (shouldIgnoreNode(node)) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      }
    }
  )

  while (candidateWalker.nextNode()) {
    const node = candidateWalker.currentNode as Text
    if (node.nodeValue) {
      extractCandidates(node.nodeValue).forEach(w => allCandidateWords.add(w))
    }
  }

  // 2. Fetch all required dictionary data upfront
  let combinedDict = { ...userDict }
  if (dbLookup && allCandidateWords.size > 0) {
    try {
      const missingWords = Array.from(allCandidateWords).filter(w => !userDict[w.toLowerCase()])
      if (missingWords.length > 0) {
        const dbResults = await dbLookup(missingWords)
        combinedDict = { ...combinedDict, ...dbResults }
      }
    } catch (e) {
      console.error('Batch DB lookup failed', e)
    }
  }

  // 3. Clear and re-scan in a single synchronous-like pass
  if (shouldClear) {
    clearHighlights(root)
  }

  // Now perform the actual processing
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (shouldIgnoreNode(node)) {
          return NodeFilter.FILTER_REJECT
        }
        const parent = node.parentElement
        if (parent?.closest('.ll-word-container')) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      }
    }
  )
const nodesToProcess: Text[] = []
while (walker.nextNode()) {
  nodesToProcess.push(walker.currentNode as Text)
}

// Group nodes by their block-level parent to identify "paragraphs"
const blockMap = new Map<Element, Text[]>()
const blocks: Element[] = []

nodesToProcess.forEach(node => {
  // Refined block identification: prioritize actual text blocks like P and LI
  let block = node.parentElement?.closest('p, li')
  
  // If no P or LI, fall back to the nearest block-level container
  if (!block) {
    block = node.parentElement?.closest('div, section, article') || node.parentElement
  }

  if (block) {
    if (!blockMap.has(block)) {
      blockMap.set(block, [])
      blocks.push(block)
    }
    blockMap.get(block)?.push(node)
  }
})
// Global state to track memory reinforcement
const wordStateMap = new Map<string, { totalDisplayed: number, lastBlockIndex: number }>()
const REFRESH_GAP = 4 // If shown in Block 0, skip Block 1, 2 & 3, show again in Block 4

blocks.forEach((block, blockIndex) => {
// ... rest of the loop

  const nodes = blockMap.get(block) || []
  const seenInBlock = new Set<string>()

  nodes.forEach(node => {
    processTextNode(
      node, 
      level, 
      vocabulary, 
      combinedDict, 
      pronunciation, 
      showIPA, 
      wordStateMap, 
      blockIndex, 
      seenInBlock,
      REFRESH_GAP
    )
  })
})
}

export const clearHighlights = (root: HTMLElement | Document = document) => {
// ... rest of the file

  const highlights = root.querySelectorAll('.ll-word-container')
  if (highlights.length === 0) return

  const parentsToNormalize = new Set<Node>()

  highlights.forEach(el => {
    const wordSpan = el.querySelector('.ll-word')
    const parent = el.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(wordSpan?.textContent || ''), el)
      parentsToNormalize.add(parent)
    }
  })

  // Normalize only once per parent to prevent jitter and excessive reflows
  parentsToNormalize.forEach(parent => {
    parent.normalize()
  })
}

export const unhighlightWord = (word: string, root: HTMLElement | Document = document) => {
  const lowerWord = word.toLowerCase()
  const highlights = root.querySelectorAll(`.ll-word-container[data-word="${lowerWord}"]`)
  if (highlights.length === 0) return

  const parentsToNormalize = new Set<Node>()

  highlights.forEach(el => {
    const wordSpan = el.querySelector('.ll-word')
    const parent = el.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(wordSpan?.textContent || ''), el)
      parentsToNormalize.add(parent)
    }
  })

  parentsToNormalize.forEach(parent => {
    parent.normalize()
  })
}

const processTextNode = (
  node: Text, 
  level: ProficiencyLevel, 
  vocabulary: Set<string>,
  dynamicDict: Record<string, WordExplanation>,
  pronunciation: 'UK' | 'US',
  showIPA: boolean = true,
  wordStateMap: Map<string, { totalDisplayed: number, lastBlockIndex: number }> = new Map(),
  blockIndex: number = 0,
  seenInBlock: Set<string> = new Set(),
  refreshGap: number = 4
) => {
  const text = node.nodeValue
  if (!text || !text.trim()) return

  const matches = analyzeText(text, level, vocabulary, dynamicDict, pronunciation)
  
  if (matches.length === 0) return // Skip if no matches

  const fragment = document.createDocumentFragment()
  let lastIndex = 0

  matches.forEach(match => {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
    }

    const lowerWord = match.word.toLowerCase()
    
    // Spaced Reinforcement Logic
    const state = wordStateMap.get(lowerWord) || { totalDisplayed: 0, lastBlockIndex: -1 }
    const isFirstInBlock = !seenInBlock.has(lowerWord)
    
    const hasMetGap = state.lastBlockIndex === -1 || (blockIndex - state.lastBlockIndex >= refreshGap)
    const shouldShowTranslation = isFirstInBlock && hasMetGap
    
    if (shouldShowTranslation) {
      state.totalDisplayed += 1
      state.lastBlockIndex = blockIndex
      wordStateMap.set(lowerWord, state)
      
      const container = document.createElement('span')
      container.className = 'll-word-container'
      container.setAttribute('data-word', lowerWord)
      container.setAttribute('contenteditable', 'false')
      
      container.style.backgroundColor = 'rgba(75, 139, 245, 0)' 
      container.style.borderRadius = '3px'
      container.style.padding = '1px 2px'
      container.style.margin = '0 1px'
      container.style.display = 'inline' 
      container.style.transition = 'all 0.4s ease'
      container.style.cursor = 'pointer'
      container.style.borderBottom = '1px solid transparent'

      setTimeout(() => {
        container.style.backgroundColor = 'rgba(75, 139, 245, 0.15)'
        container.style.borderBottom = '1px solid rgba(75, 139, 245, 0.3)'
      }, 10)

      const span = document.createElement('span')
      span.textContent = match.word
      span.className = 'll-word'
      span.style.fontWeight = 'bold'
      span.style.color = 'inherit'
      span.onclick = (e) => e.stopPropagation()
      container.appendChild(span)

      const voiceBtn = document.createElement('span')
      voiceBtn.setAttribute('aria-hidden', 'true')
      voiceBtn.style.userSelect = 'none'
      voiceBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; opacity: 0.6;">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
      `
      voiceBtn.style.marginLeft = '2px'
      voiceBtn.style.display = 'inline-flex'
      voiceBtn.style.alignItems = 'center'
      voiceBtn.title = `Listen (${pronunciation})`
      voiceBtn.onclick = (e) => {
        e.stopPropagation()
        speak(match.word, pronunciation === 'UK' ? 'en-GB' : 'en-US')
      }
      container.appendChild(voiceBtn)

      const translation = document.createElement('span')
      translation.className = 'll-translation'
      translation.setAttribute('aria-hidden', 'true')
      translation.style.userSelect = 'none'
      
      const finalExplanation = match.explanation
      const ipaLabel = pronunciation === 'UK' ? 'UK ' : 'US '
      const ipaPart = (showIPA && finalExplanation.ipa) ? `${ipaLabel}${finalExplanation.ipa}` : ''
      const separator = ipaPart ? ' · ' : ''
      translation.textContent = ` (${ipaPart}${separator}${finalExplanation.meaning})`
      
      translation.style.color = '#666' 
      translation.style.fontSize = '0.8em'
      translation.style.marginLeft = '4px'
      translation.style.fontWeight = 'normal'
      translation.style.opacity = '0.7' 
      translation.style.whiteSpace = 'nowrap' 
      
      container.appendChild(translation)
      fragment.appendChild(container)
    } else {
      // If no translation needed, just insert the plain text
      fragment.appendChild(document.createTextNode(match.word))
    }
    
    seenInBlock.add(lowerWord)
    lastIndex = match.index + match.length
  })

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
  }

  node.replaceWith(fragment)
}
