import { ProficiencyLevel, DictTag, WordExplanation } from '../types'
import { formatIPA } from '../utils/format'

// Mapping from Tags to estimated CEFR Level
export const TAG_LEVEL_MAP: Record<DictTag, number> = {
  'zk': 1,    // Zhongkao -> ~A1/A2
  'gk': 2,    // Gaokao -> ~B1
  'cet4': 3,  // CET-4 -> ~B1/B2
  'ky': 4,    // Kaoyan -> ~B2
  'cet6': 4,  // CET-6 -> ~B2+
  'ielts': 5, // IELTS -> ~C1
  'toefl': 5, // TOEFL -> ~C1
  'gre': 6    // GRE -> ~C2
}

export const USER_LEVEL_RANK: Record<ProficiencyLevel, number> = {
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
  'apple': { word: 'apple', ipa: 'ˈæpl', meaning: '苹果', tags: ['zk'] },
  'school': { word: 'school', ipa: 'skuːl', meaning: '学校', tags: ['zk'] },
  'time': { word: 'time', ipa: 'taɪm', meaning: '时间', tags: ['zk'] },
  'browser': { word: 'browser', ipa: 'ˈbraʊzər', meaning: '浏览器', tags: ['gk'] },
  'system': { word: 'system', ipa: 'ˈsɪstəm', meaning: '系统', tags: ['zk', 'gk'] },
  'program': { word: 'program', ipa: 'ˈprəʊɡræm', meaning: '程序', tags: ['zk', 'gk'] },

  // --- B1 (High School / GK / CET4) ---
  'extension': { word: 'extension', ipa_us: 'ɪkˈstenʃn', ipa_uk: 'ɪkˈstenʃn', meaning: '扩展/延伸', tags: ['gk', 'cet4'] },
  'available': { word: 'available', ipa_us: 'əˈveɪləbl', ipa_uk: 'əˈveɪləbl', meaning: '可获得的', tags: ['gk', 'cet4'] },
  'require': { word: 'require', ipa_us: 'rɪˈkwaɪər', ipa_uk: 'rɪˈkwaɪə', meaning: '需要', tags: ['gk', 'cet4'] },
  'provide': { word: 'provide', ipa_us: 'prəˈvaɪd', ipa_uk: 'prəˈvaɪd', meaning: '提供', tags: ['gk', 'cet4'] },
  'individual': { word: 'individual', ipa_us: 'ˌɪndɪˈvɪdʒuəl', ipa_uk: 'ˌɪndɪˈvɪdʒuəl', meaning: '个人的/个体', tags: ['cet4'] },
  'function': { word: 'function', ipa_us: 'ˈfʌŋkʃn', ipa_uk: 'ˈfʌŋkʃn', meaning: '功能/函数', tags: ['gk', 'cet4'] },
  
  // --- B2 (CET6 / Kaoyan) ---
  'proficiency': { word: 'proficiency', ipa_us: 'prəˈfɪʃnsi', ipa_uk: 'prəˈfɪʃnsi', meaning: '精通/熟练', tags: ['cet6', 'gre'] },
  'intelligence': { word: 'intelligence', ipa_us: 'ɪnˈtelɪdʒəns', ipa_uk: 'ɪnˈtelɪdʒəns', meaning: '智力/情报', tags: ['cet4', 'cet6'] },
  'artificial': { word: 'artificial', ipa_us: 'ˌɑːrtɪˈfɪʃl', ipa_uk: 'ˌɑːtɪˈfɪʃl', meaning: '人造的/仿真的', tags: ['cet4', 'cet6'] },
  'efficient': { word: 'efficient', ipa_us: 'ɪˈfɪʃnt', ipa_uk: 'ɪˈfɪʃnt', meaning: '高效的', tags: ['cet4', 'cet6'] },
  'component': { word: 'component', ipa_us: 'kəmˈpəʊnənt', ipa_uk: 'kəmˈpəʊnənt', meaning: '组件/成分', tags: ['cet4', 'cet6'] },
  'analyze': { word: 'analyze', ipa_us: 'ˈænəlaɪz', ipa_uk: 'ˈænəlaɪz', meaning: '分析', tags: ['cet4', 'cet6'] },
  'specific': { word: 'specific', ipa_us: 'spəˈsɪfɪk', ipa_uk: 'spəˈsɪfɪk', meaning: '具体的/特定的', tags: ['cet4'] },

  // --- C1 (IELTS / TOEFL) ---
  'acquisition': { word: 'acquisition', ipa_us: 'ˌækwɪˈzɪʃn', ipa_uk: 'ˌækwɪˈzɪʃn', meaning: '获得/习得', tags: ['toefl', 'gre'] },
  'contextual': { word: 'contextual', ipa_us: 'kənˈtekstʃuəl', ipa_uk: 'kənˈtekstʃuəl', meaning: '上下文的', tags: ['toefl'] },
  'mechanism': { word: 'mechanism', ipa_us: 'ˈmekənɪzəm', ipa_uk: 'ˈmekənɪzəm', meaning: '机制/原理', tags: ['cet6', 'toefl'] },
  'implementation': { word: 'implementation', ipa_us: 'ˌɪmplɪmenˈteɪʃn', ipa_uk: 'ˌɪmplɪmenˈteɪʃn', meaning: '实现/履行', tags: ['ielts', 'toefl'] },
  'distinct': { word: 'distinct', ipa_us: 'dɪˈstɪŋkt', ipa_uk: 'dɪˈstɪŋkt', meaning: '独特的/明显的', tags: ['cet6', 'toefl'] },
  'comprehensive': { word: 'comprehensive', ipa_us: 'ˌkɒmprɪˈhensɪv', ipa_uk: 'ˌkɒmprɪˈhensɪv', meaning: '综合的/详尽的', tags: ['cet6', 'ielts'] },

  // --- C2 (GRE / Advanced) ---
  'paradigm': { word: 'paradigm', ipa_us: 'ˈpærədaɪm', ipa_uk: 'ˈpærədaɪm', meaning: '范式', tags: ['gre'] },
  'algorithm': { word: 'algorithm', ipa_us: 'ˈælɡərɪðəm', ipa_uk: 'ˈælɡərɪðəm', meaning: '算法', tags: ['gre'] },
  'epistemology': { word: 'epistemology', ipa_us: 'ɪˌpɪstɪˈmɒlədʒi', ipa_uk: 'ɪˌpɪstɪˈmɒlədʒi', meaning: '认识论', tags: ['gre'] },
  'nuance': { word: 'nuance', ipa_us: 'ˈnjuːɑːns', ipa_uk: 'ˈnjuːɑːns', meaning: '细微差别', tags: ['gre'] },
  'ambiguous': { word: 'ambiguous', ipa_us: 'æmˈbɪɡjuəs', ipa_uk: 'æmˈbɪɡjuəs', meaning: '模棱两可的', tags: ['gre', 'toefl'] },
  'pragmatic': { word: 'pragmatic', ipa_us: 'præɡˈmætɪk', ipa_uk: 'præɡˈmætɪk', meaning: '务实的', tags: ['gre', 'ielts'] },
  
  // --- Pronunciation Test Words ---
  'schedule': { word: 'schedule', ipa_us: 'ˈskɛdʒuːl', ipa_uk: 'ˈʃɛdʒuːl', meaning: '时间表/安排', tags: ['cet4'] },
  'privacy': { word: 'privacy', ipa_us: 'ˈpraɪvəsi', ipa_uk: 'ˈprɪvəsi', meaning: '隐私', tags: ['cet4'] },
  'leisure': { word: 'leisure', ipa_us: 'ˈliːʒər', ipa_uk: 'ˈlɛʒər', meaning: '闲暇/休闲', tags: ['cet4'] },
  'advertisement': { word: 'advertisement', ipa_us: 'ˌædvərˈtaɪzmənt', ipa_uk: 'ədˈvɜːtɪsmənt', meaning: '广告', tags: ['cet4'] },
  'vitamin': { word: 'vitamin', ipa_us: 'ˈvaɪtəmɪn', ipa_uk: 'ˈvɪtəmɪn', meaning: '维生素', tags: ['cet4'] },
  'mobile': { word: 'mobile', ipa_us: 'ˈmoʊbl', ipa_uk: 'ˈmoʊbaɪl', meaning: '移动的/手机', tags: ['cet4'] }
}

export const lookupWord = (word: string, preferredPron: 'UK' | 'US' = 'US'): WordExplanation | null => {
  const lower = word.toLowerCase()
  let entry: WordExplanation | null = null

  // 1. Exact match
  if (DICT_DATA[lower]) {
    entry = { ...DICT_DATA[lower] }
  } else if (lower.endsWith('s') && DICT_DATA[lower.slice(0, -1)]) {
    // 2. Simple lemmatization (naive) - Remove 's', 'ed', 'ing'
    entry = { ...DICT_DATA[lower.slice(0, -1)] }
  } else if (lower.endsWith('ed') && DICT_DATA[lower.slice(0, -2)]) {
    entry = { ...DICT_DATA[lower.slice(0, -2)] }
  } else if (lower.endsWith('ing') && DICT_DATA[lower.slice(0, -3)]) {
    entry = { ...DICT_DATA[lower.slice(0, -3)] }
  }
  
  if (entry) {
    // Select the correct IPA based on preference
    // Create a NEW object to avoid mutating the original DICT_DATA or cached entries
    const result = { ...entry }
    if (preferredPron === 'UK' && result.ipa_uk) {
      result.ipa = formatIPA(result.ipa_uk)
    } else if (preferredPron === 'US' && result.ipa_us) {
      result.ipa = formatIPA(result.ipa_us)
    } else if (!result.ipa) {
      // Fallback if no regional IPA exists
      result.ipa = formatIPA(result.ipa_us || result.ipa_uk || '')
    } else {
      // If it already has result.ipa (like from the static dict entry directly)
      result.ipa = formatIPA(result.ipa)
    }
    return result
  }

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