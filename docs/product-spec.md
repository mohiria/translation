# In Reading – Product Specification & Prompt

## 1. Project Overview

**In Reading** is a language-learning-oriented browser extension designed to help users learn a target language while reading real web content.

Instead of translating entire sentences or paragraphs, the product **selectively explains only the words or phrases that are difficult for the user at their current language proficiency level**.

The initial focus is **English learning for users in China**, with a long-term goal of supporting:
- Multiple languages
- Global language learners

---

## 2. Problem Statement

Existing web translation tools suffer from several limitations:

1. **Low learning value**: Full translations remove exposure to the target language.
2. **Information overload**: Current tools translate everything regardless of necessity.
3. **No proficiency awareness**: Beginners and advanced learners receive identical translations.

---

## 3. Design Philosophy

1. **Minimal Reading Disruption (Stay *In* Reading)**: Preserve structure, avoid large blocks of text.
2. **Proficiency-Driven Experience**: Annotation density adapts to the user's level.
3. **Learning-Oriented, Not Translation-Oriented**: Goal is acquisition through contextual exposure.

---

## 4. Core Features

### 4.1 Intelligent Word & Phrase Explanation
- **Automatic Activation**: Triggered via shortcut (`Alt+A`) or Popup.
- **Smart Filtering**: Skips proper nouns, headers, UI elements (buttons/nav), and known simple words.
- **Spaced Reinforcement**: Intelligent frequency control (e.g., skip 1 block between repetitions) to prevent visual clutter.
- **Inline Annotations**: Displays IPA pronunciation and concise contextual meaning directly above words.

### 4.2 On-Demand Selection Translation
- **Precision Lookup**: Select any text to trigger a beautiful, auto-wrapping popup card.
- **Independence**: Works even when global auto-translation is disabled.
- **Surgical Sync**: Add/remove words from vocabulary with real-time, jitter-free DOM updates.

### 4.3 Persistence & Continuity
- **Tab-based State**: State is persisted per tab using `chrome.storage.session`.
- **SPA Awareness**: Automatically follows content changes in single-page applications (BBC, etc.) via history interception.

---

## 5. Technical Architecture

### 5.1 Technology Stack
- **Core**: React 18 + TypeScript + Vite.
- **Storage**: Chrome Storage (Sync/Local/Session) + IndexedDB (High-speed dictionary and user words).
- **DOM Engine**: Optimized `TreeWalker` with subtree pruning for massive performance gains.

---

## 6. Implementation Roadmap

### Phase 1: Core Loop (Completed)
- [x] Project Scaffolding
- [x] DOM Traversal and Text Node wrapping
- [x] Basic Tooltip UI

### Phase 2: User Experience & Stability (Completed)
- [x] **Popup UI**: Proficiency selector, pronunciation style, and status toggle.
- [x] **State Persistence**: Across page refreshes and SPA navigation.
- [x] **Anti-Jitter Logic**: Surgical DOM updates for vocabulary changes.
- [x] **Subtree Pruning**: Performance-optimized scanning skipping non-content areas.

### Phase 3: Advanced Intelligence (In Progress)
- [ ] **Paragraph Context LLM**: Full paragraph analysis instead of single-word lookup.
- [ ] **Hybrid Context Caching**: `hash(sentence + word)` based IndexedDB caching to save tokens.
- [ ] **Native TTS**: High-quality speech synthesis integration.

### Phase 4: Long-Term Vision
- [ ] **Adaptive Learning**: Level adjustments based on user lookup history.
- [ ] **Idiom Detection**: Identification of non-literal phrases and collocations.
