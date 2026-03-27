import { ProficiencyLevel, DictTag } from '../types'

// Mapping from Tags to estimated CEFR Level
export const TAG_LEVEL_MAP: Record<DictTag, number> = {
  'zk': 1,    // Zhongkao -> ~A1/A2
  'gk': 2,    // Gaokao -> ~B1
  'cet4': 3,  // CET-4 -> ~B1/B2
  'ky': 4,    // Kaoyan -> ~B2
  'cet6': 4,  // CET-6 -> ~B2+
  'ielts': 5, // IELTS -> ~C1
  'toefl': 5, // TOEFL -> ~C1
  'gre': 6,   // GRE -> ~C2
  'a1': 1,
  'a2': 1.5,
  'b1': 2,
  'b2': 3,
  'c1': 5,
  'c2': 6
}

export const USER_LEVEL_RANK: Record<ProficiencyLevel, number> = {
  'CEFR_A1': 1, 
  'CEFR_A2': 1.5,
  'CEFR_B1': 2, 
  'CEFR_B2': 3,
  'CET4': 3,   // CET4 maps to B2 threshold
  'CET6': 5,   // CET6 maps to C1 threshold
  'CEFR_C1': 6, 
  'CEFR_C2': 7 
}