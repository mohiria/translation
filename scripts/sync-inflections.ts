import fs from 'fs';

const confusionPath = 'public/dictionaries/confusion-map.json';
const inflectionsPath = 'src/common/nlp/inflections.json';

const confusionData = JSON.parse(fs.readFileSync(confusionPath, 'utf8'));
const inflectionsData = JSON.parse(fs.readFileSync(inflectionsPath, 'utf8'));

// 简单的变形生成规则（用于覆盖 90% 的情况，剩下的我会在后续批次中手动微调）
const generateInflections = (word, entries) => {
  const result = new Set();
  const isVerb = entries.some(e => e.type.includes('verb'));
  const isNoun = entries.some(e => e.type.includes('noun'));

  if (isNoun) {
    // 基础复数规则
    if (word.endsWith('y')) result.add(word.slice(0, -1) + 'ies');
    else if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch')) result.add(word + 'es');
    else result.add(word + 's');
  }

  if (isVerb) {
    // 基础动词规则
    if (word.endsWith('e')) {
      result.add(word + 's');
      result.add(word + 'd');
      result.add(word.slice(0, -1) + 'ing');
    } else {
      result.add(word + 's');
      result.add(word + 'ed');
      result.add(word + 'ing');
    }
  }
  return Array.from(result);
};

let count = 0;
for (const word in confusionData) {
  const infs = generateInflections(word, confusionData[word].entries);
  infs.forEach(inf => {
    if (!inflectionsData[inf]) {
      inflectionsData[inf] = word;
      count++;
    }
  });
}

fs.writeFileSync(inflectionsPath, JSON.stringify(inflectionsData, null, 2));
console.log(`Updated inflections.json with ${count} new mappings from confusion-map.`);
