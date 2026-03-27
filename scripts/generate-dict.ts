import fs from 'fs';
import path from 'path';
import pako from 'pako';

// --- Configuration ---
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'dictionary-core.json.gz');
const VERSION_FILE = path.join(OUTPUT_DIR, 'version.json');
const OXFORD_SOURCE = path.join(process.cwd(), 'oxford_5000.json');

const POS_STANDARD_MAP: Record<string, string> = {
  'n': 'noun',
  'v': 'verb',
  'adj': 'adjective',
  'adv': 'adverb',
  'n.': 'noun',
  'v.': 'verb',
  'adj.': 'adjective',
  'adv.': 'adverb',
  'indefinite article': 'determiner',
  'definite article': 'determiner',
  'auxiliary verb': 'verb',
  'modal verb': 'verb',
  'linking verb': 'verb',
  'ordinal number': 'number',
  'infinitive marker': 'particle'
};

const standardizePOS = (pos: string) => {
  const lower = pos.toLowerCase().trim();
  return POS_STANDARD_MAP[lower] || lower;
};

const main = async () => {
    console.log(`Starting Oxford Dictionary Integration...`);
    
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let entries: any[] = [];
    
    if (fs.existsSync(OXFORD_SOURCE)) {
        console.log('Found oxford_5000.json! Parsing...');
        const content = fs.readFileSync(OXFORD_SOURCE, 'utf-8');
        const data = JSON.parse(content);
        
        // Helper to clean translation
        const cleanTranslation = (word: string, fullTranslation: string) => {
            if (!fullTranslation) return '';
            let short = fullTranslation.replace(/[\(\（].*?[\)\）]/g, ' ').trim();
            short = short.replace(/\s+/g, ' ')
                         .replace(/^[，,；;：:、]+|[，,；;：:、]+$/g, '')
                         .trim();
            if (!short) {
                const match = fullTranslation.match(/[\(\（](.*?)[\)\）]/);
                if (match && match[1]) short = match[1].trim();
                else short = fullTranslation;
            }
            return short;
        };

        const rawEntries = Object.values(data);
        console.log(`Loaded ${rawEntries.length} raw entries from Oxford source.`);

        // Group by word
        const groupedMap = new Map<string, any[]>();
        rawEntries.forEach((item: any) => {
            const word = item.word.toLowerCase();
            if (!groupedMap.has(word)) groupedMap.set(word, []);
            groupedMap.get(word)!.push(item);
        });

        entries = Array.from(groupedMap.entries()).map(([word, items]) => {
            const definitions = items.map(item => {
                const fullTranslation = item.translation || '';
                return {
                    type: standardizePOS(item.type),
                    cefr: item.cefr,
                    definition: item.definition,
                    example: item.example,
                    translation: fullTranslation,
                    short_translation: cleanTranslation(word, fullTranslation)
                };
            });

            // Logic: Group by short_translation to merge same meanings
            const transGroups = new Map<string, string[]>(); // meaning -> types[]
            definitions.forEach(d => {
                if (!transGroups.has(d.short_translation)) {
                    transGroups.set(d.short_translation, []);
                }
                const fullType = d.type;
                if (!transGroups.get(d.short_translation)!.includes(fullType)) {
                    transGroups.get(d.short_translation)!.push(fullType);
                }
            });

            // Construct combined meaning
            const combinedMeaningParts: string[] = [];
            transGroups.forEach((types, meaning) => {
                combinedMeaningParts.push(`${types.join(', ')} ${meaning}`);
            });
            const meaning = combinedMeaningParts.join('; ');

            // Construct combined types (full names)
            const allTypes = Array.from(new Set(items.map(i => standardizePOS(i.type))));
            
            // Get all unique CEFRs
            const cefrs = Array.from(new Set(items.map(i => i.cefr.toLowerCase())));

            return {
                word: word,
                ipa_uk: items[0].phon_br,
                ipa_us: items[0].phon_n_am,
                meaning: meaning,
                type: allTypes.join(', '),
                cefr: cefrs, // Simplified to array of all cefr levels
                context: items[0].example,
                definitions: definitions,
                source: 'Oxford 5000'
            };
        });
    } else {
        console.error('Oxford source file not found at:', OXFORD_SOURCE);
        process.exit(1);
    }

    console.log(`Total Unified Entries: ${entries.length}`);

    // 3. Serialize & Compress
    const jsonString = JSON.stringify(entries);
    const mbSize = (jsonString.length / 1024 / 1024).toFixed(2);
    const compressed = pako.deflate(jsonString);
    const compMbSize = (compressed.length / 1024 / 1024).toFixed(2);
    
    console.log(`Raw: ${mbSize} MB, Compressed: ${compMbSize} MB`);

    fs.writeFileSync(OUTPUT_FILE, compressed);
    
    const versionInfo = { 
        version: Date.now(), 
        count: entries.length,
        size_raw: mbSize + 'MB',
        size_gzip: compMbSize + 'MB'
    };
    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionInfo, null, 2));

    console.log(`SUCCESS! Dictionary generated at: ${OUTPUT_FILE}`);
};

main();
