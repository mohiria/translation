import { ProficiencyLevel, DictTag, WordExplanation } from '../types'

// Mapping from Tags to estimated CEFR Level
const TAG_LEVEL_MAP: Record<DictTag, number> = {
  'zk': 1,    // Zhongkao -> ~A1/A2
  'gk': 2,    // Gaokao -> ~B1
  'cet4': 3,  // CET-4 -> ~B1/B2
  'ky': 4,    // Kaoyan -> ~B2
  'cet6': 4,  // CET-6 -> ~B2+
  'ielts': 5, // IELTS -> ~C1
  'toefl': 5, // TOEFL -> ~C1
  'gre': 6    // GRE -> ~C2
}

const USER_LEVEL_RANK: Record<ProficiencyLevel, number> = {
  'CEFR_A1': 1, 'CEFR_A2': 1.5,
  'CEFR_B1': 2, 'CEFR_B2': 3, // B1 is rank 2 (GK level), B2 is rank 3/4
  'CET4': 3, 
  'CET6': 4, 
  'CEFR_C1': 5, 'CEFR_C2': 6
}

// ---------------------------------------------------------------------------
// Extended Dictionary Data (Simulating a local ECDICT subset)
// In a real app, this would be imported from a large JSON or SQLite
// ---------------------------------------------------------------------------
const DICT_DATA: Record<string, WordExplanation> = {
  // --- A1 / A2 (Middle School / ZK) ---
  'apple': { word: 'apple', ipa: '/ˈæpl/', meaning: '苹果', tags: ['zk'] },
  'school': { word: 'school', ipa: '/skuːl/', meaning: '学校', tags: ['zk'] },
  'time': { word: 'time', ipa: '/taɪm/', meaning: '时间', tags: ['zk'] },
  'browser': { word: 'browser', ipa: '/ˈbraʊzər/', meaning: '浏览器', tags: ['gk'] },
  'system': { word: 'system', ipa: '/ˈsɪstəm/', meaning: '系统', tags: ['zk', 'gk'] },
  'program': { word: 'program', ipa: '/ˈprəʊɡræm/', meaning: '程序', tags: ['zk', 'gk'] },

  // --- B1 (High School / GK / CET4) ---
  'extension': { word: 'extension', ipa: '/ɪkˈstenʃn/', meaning: '扩展/延伸', tags: ['gk', 'cet4'] },
  'available': { word: 'available', ipa: '/əˈveɪləbl/', meaning: '可获得的', tags: ['gk', 'cet4'] },
  'require': { word: 'require', ipa: '/rɪˈkwaɪər/', meaning: '需要', tags: ['gk', 'cet4'] },
  'provide': { word: 'provide', ipa: '/prəˈvaɪd/', meaning: '提供', tags: ['gk', 'cet4'] },
  'individual': { word: 'individual', ipa: '/ˌɪndɪˈvɪdʒuəl/', meaning: '个人的/个体', tags: ['cet4'] },
  'function': { word: 'function', ipa: '/ˈfʌŋkʃn/', meaning: '功能/函数', tags: ['gk', 'cet4'] },
  
  // --- B2 (CET6 / Kaoyan) ---
  'proficiency': { word: 'proficiency', ipa: '/prəˈfɪʃnsi/', meaning: '精通/熟练', tags: ['cet6', 'gre'] },
  'intelligence': { word: 'intelligence', ipa: '/ɪnˈtelɪdʒəns/', meaning: '智力/情报', tags: ['cet4', 'cet6'] },
  'artificial': { word: 'artificial', ipa: '/ˌɑːrtɪˈfɪʃl/', meaning: '人造的/仿真的', tags: ['cet4', 'cet6'] },
  'efficient': { word: 'efficient', ipa: '/ɪˈfɪʃnt/', meaning: '高效的', tags: ['cet4', 'cet6'] },
  'component': { word: 'component', ipa: '/kəmˈpəʊnənt/', meaning: '组件/成分', tags: ['cet4', 'cet6'] },
  'analyze': { word: 'analyze', ipa: '/ˈænəlaɪz/', meaning: '分析', tags: ['cet4', 'cet6'] },
  'specific': { word: 'specific', ipa: '/spəˈsɪfɪk/', meaning: '具体的/特定的', tags: ['cet4'] },

  // --- C1 (IELTS / TOEFL) ---
  'acquisition': { word: 'acquisition', ipa: '/ˌækwɪˈzɪʃn/', meaning: '获得/习得', tags: ['toefl', 'gre'] },
  'contextual': { word: 'contextual', ipa: '/kənˈtekstʃuəl/', meaning: '上下文的', tags: ['toefl'] },
  'mechanism': { word: 'mechanism', ipa: '/ˈmekənɪzəm/', meaning: '机制/原理', tags: ['cet6', 'toefl'] },
  'implementation': { word: 'implementation', ipa: '/ˌɪmplɪmenˈteɪʃn/', meaning: '实现/履行', tags: ['ielts', 'toefl'] },
  'distinct': { word: 'distinct', ipa: '/dɪˈstɪŋkt/', meaning: '独特的/明显的', tags: ['cet6', 'toefl'] },
  'comprehensive': { word: 'comprehensive', ipa: '/ˌkɒmprɪˈhensɪv/', meaning: '综合的/详尽的', tags: ['cet6', 'ielts'] },

  // --- C2 (GRE / Advanced) ---
  'paradigm': { word: 'paradigm', ipa: '/ˈpærədaɪm/', meaning: '范式', tags: ['gre'] },
  'algorithm': { word: 'algorithm', ipa: '/ˈælɡərɪðəm/', meaning: '算法', tags: ['gre'] },
  'epistemology': { word: 'epistemology', ipa: '/ɪˌpɪstɪˈmɒlədʒi/', meaning: '认识论', tags: ['gre'] },
  'nuance': { word: 'nuance', ipa: '/ˈnjuːɑːns/', meaning: '细微差别', tags: ['gre'] },
  'ambiguous': { word: 'ambiguous', ipa: '/æmˈbɪɡjuəs/', meaning: '模棱两可的', tags: ['gre', 'toefl'] },
  'pragmatic': { word: 'pragmatic', ipa: '/præɡˈmætɪk/', meaning: '务实的', tags: ['gre', 'ielts'] }
}

export const lookupWord = (word: string): WordExplanation | null => {
  const lower = word.toLowerCase()
  // 1. Exact match
  if (DICT_DATA[lower]) return DICT_DATA[lower]
  
  // 2. Simple lemmatization (naive) - Remove 's', 'ed', 'ing'
  // In production, use a library like 'compromise' or 'natural'
  if (lower.endsWith('s') && DICT_DATA[lower.slice(0, -1)]) return DICT_DATA[lower.slice(0, -1)]
  if (lower.endsWith('ed') && DICT_DATA[lower.slice(0, -2)]) return DICT_DATA[lower.slice(0, -2)]
  if (lower.endsWith('ing') && DICT_DATA[lower.slice(0, -3)]) return DICT_DATA[lower.slice(0, -3)]
  
  return null
}

export const isDifficultyAbove = (word: string, userLevel: ProficiencyLevel): boolean => {
  const entry = lookupWord(word)
  if (!entry || !entry.tags) return false
  
  // Calculate word difficulty rank based on its tags
  // We take the LOWEST rank found in tags (e.g., if a word is both 'zk' and 'cet4', treat it as 'zk' level difficulty)
  // Wait, no. Logic:
  // If I am CET4 level, I want to see words that are CET4 or ABOVE (Harder).
  // I don't want to see 'zk' (Middle school) words.
  // So, a word's "Difficulty" is determined by its *easiest* occurrence? 
  // 'apple' is 'zk'. Rank 1.
  // 'algorithm' is 'gre'. Rank 6.
  
  // Logic: 
  // Word Rank = Min(Tag Ranks). 
  // Example: 'system' is 'zk' and 'gk'. Rank = 1.
  
  const wordRanks = entry.tags.map(t => TAG_LEVEL_MAP[t] || 3) // Default to 3 if unknown
  const wordDifficulty = Math.min(...wordRanks)
  
  const userRank = USER_LEVEL_RANK[userLevel]
  
  // Show if Word Difficulty >= User Rank
  // Example: User is CET4 (Rank 3).
  // 'apple' (Rank 1) < 3 -> Hide.
  // 'system' (Rank 1) < 3 -> Hide.
  // 'function' (Rank 2 - gk) < 3 -> Hide. (Wait, if I am CET4, I assume I know GK words)
  // 'proficiency' (Rank 4 - cet6) >= 3 -> Show.
  
  return wordDifficulty >= userRank
}