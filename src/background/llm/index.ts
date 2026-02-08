import { LLMSettings } from '../../common/types'

interface LLMResponse {
  word: string
  ipa: string
  meaning: string
  context: string
  source: string
}

export const fetchFromLLM = async (
  word: string, 
  contextSentence: string, 
  settings: LLMSettings
): Promise<LLMResponse> => {
  const { provider, apiKey, baseUrl, model } = settings
  
  if (!apiKey) {
    throw new Error('API Key is required for AI features')
  }

  const systemPrompt = `
You are an expert linguist and translator.
Your task is to explain the word "${word}" based on the provided context sentence.
Context: "${contextSentence}"

Output JSON format ONLY:
{
  "word": "${word}",
  "ipa": "IPA pronunciation",
  "meaning": "Concise Chinese meaning fitting the context",
  "context": "Brief explanation of why this meaning applies here (in Chinese)"
}
`

  // 1. Google Gemini
  if (provider === 'gemini') {
    const host = baseUrl ? baseUrl.replace(/\/$/, '') : 'https://generativelanguage.googleapis.com';
    const url = `${host}/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    const text = data.candidates[0].content.parts[0].text
    return parseLLMJson(text, 'Gemini')
  }

  // 2. OpenAI / Deepseek / Claude (using OpenAI compatible interface)
  let endpoint = '';
  let modelName = model || 'gpt-3.5-turbo';

  if (provider === 'openai') {
    endpoint = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
  } else if (provider === 'deepseek') {
    endpoint = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : 'https://api.deepseek.com/chat/completions';
    modelName = model || 'deepseek-chat';
  } else if (provider === 'custom') {
    if (!baseUrl) throw new Error('Base URL is required for Custom Provider');
    endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    modelName = model || 'gpt-3.5-turbo';
  } else if (provider === 'claude') {
    if (baseUrl) {
      endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    } else {
      return fetchFromAnthropic(apiKey, model || 'claude-3-5-haiku-20240307', systemPrompt);
    }
  } else if (baseUrl) {
    endpoint = `${baseUrl}/chat/completions`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: 'You are a helpful dictionary assistant. Output valid JSON only.' },
        { role: 'user', content: systemPrompt }
      ],
      temperature: 0.3
    })
  })

  const data = await response.json()
  if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message)
  const text = data.choices[0].message.content
  
  let sourceName = 'AI'
  if (provider === 'openai') sourceName = 'GPT'
  else if (provider === 'deepseek') sourceName = 'Deepseek'
  else if (provider === 'custom') sourceName = 'Custom AI'
  else if (provider === 'claude' && baseUrl) sourceName = 'Claude (Proxy)'
  
  return parseLLMJson(text, sourceName)
}

const fetchFromAnthropic = async (apiKey: string, model: string, prompt: string): Promise<LLMResponse> => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  const text = data.content[0].text
  return parseLLMJson(text, 'Claude')
}

const parseLLMJson = (text: string, source: string): LLMResponse => {
  try {
    // Cleanup markdown code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const json = JSON.parse(cleanText)
    return {
      word: json.word,
      ipa: json.ipa,
      meaning: json.meaning,
      context: json.context,
      source: `AI (${source})`
    }
  } catch (e) {
    console.error('Failed to parse LLM response', text)
    throw new Error('Invalid AI response format')
  }
}
