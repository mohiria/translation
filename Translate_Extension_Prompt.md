# Language Learning Browser Extension – Product Prompt

## 1. Project Overview

This project is a **language-learning-oriented browser extension** designed to help users learn a target language while reading real web content.

Instead of translating entire sentences or paragraphs, the product **selectively explains only the words or phrases that are difficult for the user at their current language proficiency level**.

The initial focus is **English learning for users in China**, with a long-term goal of supporting:
- Multiple languages
- Global language learners

---

## 2. Problem Statement

Existing web translation tools suffer from several limitations:

1. **Low learning value**
   - Full translations remove exposure to the target language
   - Bilingual paragraph translations disrupt reading flow

2. **Information overload**
   - Users often only need help with:
     - New words
     - Phrases or collocations
     - Idioms or context-specific meanings
   - Current tools translate everything regardless of necessity

3. **No proficiency awareness**
   - Beginners and advanced learners receive identical translations
   - This contradicts effective language acquisition principles (e.g. i+1)

---

## 3. Design Philosophy

1. **Minimal Reading Disruption**
   - Preserve original webpage structure
   - Avoid large blocks of translated text
   - Provide lightweight, inline explanations only where needed

2. **Proficiency-Driven Experience**
   - Explanation density and depth adapt to the user’s language level
   - The same webpage looks different to users of different proficiency

3. **Learning-Oriented, Not Translation-Oriented**
   - The goal is not just understanding
   - The goal is acquisition through contextual exposure

---

## 4. Core Features

### 4.1 Intelligent Word & Phrase Explanation

- Users activate translation mode via a shortcut
- The system automatically detects:
  - Unfamiliar words
  - Difficult vocabulary
  - Fixed expressions and collocations
  - Idioms and non-literal phrases
- Inline explanations include:
  - IPA pronunciation
  - Short contextual meaning
  - Optional text-to-speech playback

#### Example Output
He brushed off (/brʌʃ ɒf/ 对……不予理会) the criticism (/ˈkrɪtɪsɪzəm/ 批评),
saying the decision was made in the best interests of (为了……的最大利益) the company.



> Only minimal necessary explanations are shown. Full sentence translation is intentionally avoided.

---

### 4.2 Vocabulary Book (Word List)

- Users can add words or phrases via:
  - Text selection
  - Clicking explanation cards
- Vocabulary entries influence future behavior:
  - Saved words are always highlighted
  - New pages adapt based on known vocabulary
- Vocabulary difficulty is aligned with the user’s proficiency level

---

### 4.3 Language Proficiency Management

Supported methods:

1. **Manual Selection**
   - CET-4 / CET-6
   - CEFR levels (A2–C1)

2. **Quick Assessment**
   - Lightweight vocabulary and reading tests
   - Used to estimate initial proficiency

Proficiency affects:
- Which words are explained
- How detailed each explanation is

---

### 4.4 Pluggable Explanation Engines

Users can choose between different explanation sources:

1. **Dictionary / Rule-Based Engine**
   - Fast
   - Works offline
   - Default and fallback option

2. **Traditional Translation APIs**
   - Microsoft Translate
   - Google Translate

3. **Large Language Models (LLMs)**
   - Context-aware explanations
   - Idiom interpretation
   - Teaching-style explanations
   - Requires user-provided API key
   - Users are explicitly informed that content is sent to third parties

---

## 5. Offline & Privacy Constraints

- The product must remain usable without network access
- AI and translation APIs are optional enhancements
- Privacy-first design:
  - API keys stored locally and encrypted
  - Clear disclosure of data transmission behavior

---

## 6. Platform & Form Factor

- Platform: **Browser Extension**
  - Chrome and Edge initially
- No mandatory account system in early versions
  - Vocabulary and proficiency data stored locally
  - Account-based sync planned as a future feature

---

## 7. Reference Product & Differentiation

Reference:
- **Immersive Translate**

Key differences:
- Immersive Translate is translation-focused
- This product is learning-focused
- Core advantages:
  - Word- and phrase-level explanations
  - Proficiency-aware behavior
  - Long-term language acquisition value

---

## 8. Long-Term Vision

- Multi-language support beyond English
- Global user base
- Adaptive learning intelligence:
  - Weakness detection
  - Implicit grammar guidance
- Integration with reading, listening, and writing workflows

---

## 9. Usage Instruction

Please fully understand the above context before performing further analysis or design.
Do not treat this product as a generic translation tool.

---

## 10. Technical Architecture

### 10.1 Technology Stack
- **Core Framework**: React 18 + TypeScript
- **Build Tool**: Vite + @crxjs/vite-plugin
- **Extension Standard**: Manifest V3
- **Styling**: CSS Modules / Tailwind (TBD)
- **State Management**: React Context + Chrome Storage API

### 10.2 Core Modules
1.  **NLP Engine (`src/common/nlp`)**:
    - Responsible for tokenizing text and matching against vocabulary databases.
    - Handles proficiency filtering logic (e.g., "Show only B2+ words").
2.  **Content Injector (`src/content`)**:
    - Uses `TreeWalker` to safely traverse DOM text nodes.
    - Wraps target words in custom web components or shadow DOM containers to prevent style leakage.
3.  **Explanation Service**:
    - Abstracted interface allowing switching between Local Dictionary, Translation API, and LLM.

---

## 11. Implementation Roadmap

### Phase 1: Core Loop (Current)
- [x] Project Scaffolding (Vite/React/TS/Manifest V3)
- [x] Basic "Mock" Dictionary implementation
- [x] DOM Traversal and Text Node wrapping (Security & Performance focused)
- [x] Basic Tooltip UI for explanations
- [x] Build pipeline fixed (Assets & Types)

### Phase 2: User Configuration (Next)
- [ ] **Popup UI**: Implement proficiency selector in `src/popup`.
- [ ] **State Sync**: Connect Popup settings to Content Script via Storage API.
- [ ] **Styles**: Replace raw DOM tooltip with a React Component + Shadow DOM (to avoid CSS conflicts).

### Phase 3: Advanced Intelligence
- [ ] LLM API Integration
- [ ] Context-aware prompt engineering


