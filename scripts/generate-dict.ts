import fs from 'fs';
import path from 'path';
import pako from 'pako';

// --- Configuration ---
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'dictionary-core.json.gz');
const VERSION_FILE = path.join(OUTPUT_DIR, 'version.json');
const OXFORD_SOURCE = path.join(process.cwd(), 'oxford_5000.json');

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
        
        // Data is an object with numeric keys "0", "1", ...
        const rawEntries = Object.values(data);
        console.log(`Loaded ${rawEntries.length} entries from Oxford source.`);

        entries = rawEntries.map((item: any) => {
            return {
                word: item.word,
                type: item.type,
                cefr: item.cefr,
                tags: [item.cefr.toLowerCase()],
                ipa_uk: item.phon_br,
                ipa_us: item.phon_n_am,
                definition: item.definition,
                example: item.example,
                translation: item.translation,
                meaning: item.translation, // Use translation as primary meaning for display
                context: item.example,     // Use example as primary context
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
