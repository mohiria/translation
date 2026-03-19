import { LLMProvider } from './types'

export const LLM_MODELS: Record<Exclude<LLMProvider, 'custom'>, string[]> = {
  gemini: ['gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  openai: ['gpt-5.4', 'gpt-5.2', 'gpt-5-mini', 'gpt-4o-mini'],
  claude: ['Claude-Sonnet-4.6', 'Claude-Haiku-4.5', 'Claude-3.5-Haiku', 'Claude-3-Haiku'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  moonshot: ['kimi-k2.5'],
  zhipu: ['glm-5', 'glm-4.7-flash', 'glm-4.6-flash'],
  qwen: ['qwen3.5-plus', 'qwen3.5-flash', 'qwen3-vl-32b-instruct']
}

export const LLM_DEFAULT_URLS: Record<LLMProvider, string> = {
  gemini: 'https://generativelanguage.googleapis.com',
  openai: 'https://api.openai.com/v1',
  claude: 'https://api.anthropic.com',
  deepseek: 'https://api.deepseek.com',
  moonshot: 'https://api.moonshot.cn/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  custom: 'https://api.your-proxy.com/v1'
}
