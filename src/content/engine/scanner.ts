import { analyzeText } from '../../common/nlp/analyzer'
import { ProficiencyLevel, SavedWord, WordExplanation } from '../../common/types'
import { addToVocabulary } from '../../common/storage/vocabulary'
import { speak } from '../../common/utils/speech'

const IGNORE_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'CODE', 'PRE'])

export const scanAndHighlight = (
  root: HTMLElement | Document, 
  level: ProficiencyLevel, 
  vocabulary: Set<string> = new Set(),
  dynamicDict: Record<string, WordExplanation> = {}
) => {
  console.log('Scanning for level:', level, 'Vocab size:', vocabulary.size, 'Dict size:', Object.keys(dynamicDict).length)
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement
        if (!parent || IGNORE_TAGS.has(parent.tagName) || parent.isContentEditable) {
          return NodeFilter.FILTER_REJECT
        }
        if (parent.closest('.ll-word-container')) {
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

  console.log(`Found ${nodesToProcess.length} text nodes to process`)
  nodesToProcess.forEach(node => processTextNode(node, level, vocabulary, dynamicDict))
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
  dynamicDict: Record<string, WordExplanation>
) => {
  const text = node.nodeValue
  if (!text || !text.trim()) return

  const matches = analyzeText(text, level, vocabulary, dynamicDict)
  if (matches.length > 0) {
    console.log(`Found ${matches.length} matches in text node:`, text.substring(0, 30) + '...')
  }

  const fragment = document.createDocumentFragment()
  let lastIndex = 0

  matches.forEach(match => {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
    }

    const container = document.createElement('span')
    container.className = 'll-word-container'
    
    container.style.backgroundColor = 'rgba(75, 139, 245, 0.12)'
    container.style.borderRadius = '3px'
    container.style.padding = '0 4px'
    container.style.margin = '0 2px'
    container.style.display = 'inline-block' 
    container.style.lineHeight = '1.2'
    container.style.transition = 'background-color 0.2s'

    const span = document.createElement('span')
    span.textContent = match.word
    span.className = 'll-word'
    span.style.fontWeight = 'bold'
    span.style.color = 'inherit'
    span.style.cursor = 'pointer'
    
    span.onclick = async (e) => {
      e.stopPropagation()
      const savedWord: SavedWord = {
        ...match.explanation,
        timestamp: Date.now(),
        sourceUrl: window.location.href
      }
      await addToVocabulary(savedWord)
      container.style.backgroundColor = 'rgba(75, 139, 245, 0.3)'
    }
    
    container.appendChild(span)

    // Voice Icon
    const voiceBtn = document.createElement('span')
    voiceBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: -2px;">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    `
    voiceBtn.style.marginLeft = '4px'
    voiceBtn.style.cursor = 'pointer'
    voiceBtn.style.color = '#666'
    voiceBtn.style.display = 'inline-flex'
    voiceBtn.style.alignItems = 'center'
    voiceBtn.title = 'Listen'
    voiceBtn.onclick = (e) => {
      e.stopPropagation()
      speak(match.word)
    }
    container.appendChild(voiceBtn)

    const translation = document.createElement('span')
    translation.className = 'll-translation'
    const separator = match.explanation.ipa ? ' · ' : ''
    const ipaPart = match.explanation.ipa || ''
    translation.textContent = ` (${ipaPart}${separator}${match.explanation.meaning})`
    
    translation.style.color = '#555' 
    translation.style.fontSize = '0.85em'
    translation.style.marginLeft = '6px'
    translation.style.fontWeight = 'normal'
    translation.style.letterSpacing = '0.05em'
    translation.style.opacity = '0.9'
    
    container.appendChild(translation)
    fragment.appendChild(container)

    lastIndex = match.index + match.length
  })

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
  }

  node.replaceWith(fragment)
}
