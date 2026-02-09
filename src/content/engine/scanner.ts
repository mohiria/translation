import { analyzeText } from '../../common/nlp/analyzer'
import { ProficiencyLevel, SavedWord, WordExplanation } from '../../common/types'
import { addToVocabulary } from '../../common/storage/vocabulary'
import { speak } from '../../common/utils/speech'
import { formatIPA } from '../../common/utils/format'

const IGNORE_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'CODE', 'PRE'])

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
  // "userDict" contains local user vocab. 
  // "dbLookup" is the new async function to query the huge IndexedDB
  userDict: Record<string, WordExplanation> = {},
  pronunciation: 'UK' | 'US' = 'US',
  dbLookup?: (words: string[]) => Promise<Record<string, WordExplanation>>,
  shouldClear: boolean = false
) => {
  console.log('Scanning for level:', level, 'Pronunciation:', pronunciation)
  
  // 1. Collect all text nodes (Scan the RAW text, even if highlighted)
  // To scan even highlighted text, we need to temporarily ignore the rejection
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement
        if (!parent || IGNORE_TAGS.has(parent.tagName) || parent.isContentEditable) {
          return NodeFilter.FILTER_REJECT
        }
        // If we ARE going to clear anyway, we can scan everything.
        // If not, we skip already highlighted ones.
        if (!shouldClear && parent.closest('.ll-word-container')) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      }
    }
  )

  const nodesToProcess: Text[] = []
  const allCandidateWords: Set<string> = new Set()

  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    if (node.nodeValue && node.nodeValue.trim()) {
      nodesToProcess.push(node)
      extractCandidates(node.nodeValue).forEach(w => allCandidateWords.add(w))
    }
  }

  // 2. Batch Lookup in IndexedDB (Heavy async work)
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

  // 3. THE MOMENT OF TRUTH: Clear and Re-draw in the same task
  if (shouldClear) {
    clearHighlights(root)
  }

  // 4. Process Nodes with the fully populated dictionary
  nodesToProcess.forEach(node => {
    // Check if node is still in DOM (clearing might have replaced its parent)
    if (node.parentNode) {
      processTextNode(node, level, vocabulary, combinedDict, pronunciation)
    }
  })
}

export const clearHighlights = (root: HTMLElement | Document = document) => {
  const highlights = root.querySelectorAll('.ll-word-container')
  console.log(`Clearing ${highlights.length} highlights`)
  highlights.forEach(el => {
    const wordSpan = el.querySelector('.ll-word')
    const parent = el.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(wordSpan?.textContent || ''), el)
      parent.normalize()
    }
  })
}

const processTextNode = (
  node: Text, 
  level: ProficiencyLevel, 
  vocabulary: Set<string>,
  dynamicDict: Record<string, WordExplanation>,
  pronunciation: 'UK' | 'US'
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

    const container = document.createElement('span')
    container.className = 'll-word-container'
    
    // Smooth Transition Styles
    container.style.backgroundColor = 'rgba(75, 139, 245, 0)' // Start transparent
    container.style.borderRadius = '3px'
    container.style.padding = '1px 2px'
    container.style.margin = '0 1px'
    container.style.display = 'inline' // Use inline to prevent line-height jumps
    container.style.transition = 'all 0.4s ease'
    container.style.cursor = 'pointer'
    container.style.borderBottom = '1px solid transparent'

    // Trigger fade-in after a micro-task to allow DOM insertion
    setTimeout(() => {
      container.style.backgroundColor = 'rgba(75, 139, 245, 0.15)'
      container.style.borderBottom = '1px solid rgba(75, 139, 245, 0.3)'
    }, 10)

    // The explanation object already has the correct regional IPA from analyzeText
    const finalExplanation = match.explanation

    const span = document.createElement('span')
    span.textContent = match.word
    span.className = 'll-word'
    span.style.fontWeight = 'bold'
    span.style.color = 'inherit'
    
    span.onclick = async (e) => {
      e.stopPropagation()
      const savedWord: SavedWord = {
        ...finalExplanation,
        timestamp: Date.now(),
        sourceUrl: window.location.href
      }
      await addToVocabulary(savedWord)
      container.style.backgroundColor = 'rgba(75, 139, 245, 0.4)'
    }
    
    container.appendChild(span)

    // Voice Icon (Smaller and more subtle)
    const voiceBtn = document.createElement('span')
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
    
    // Use the correctly formatted IPA with UK/US label
    const ipaLabel = pronunciation === 'UK' ? 'UK ' : 'US '
    const separator = finalExplanation.ipa ? ' · ' : ''
    const ipaPart = finalExplanation.ipa ? `${ipaLabel}${formatIPA(finalExplanation.ipa)}` : ''
    
    translation.textContent = ` (${ipaPart}${separator}${finalExplanation.meaning})`
    
    translation.style.color = '#666' 
    translation.style.fontSize = '0.8em'
    translation.style.marginLeft = '4px'
    translation.style.fontWeight = 'normal'
    translation.style.opacity = '0.8'
    
    container.appendChild(translation)
    fragment.appendChild(container)

    lastIndex = match.index + match.length
  })

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
  }

  node.replaceWith(fragment)
}
