// Placeholder script for users to download real dictionary data
// Usage: ts-node scripts/download-real-dict.ts

console.log(`
-----------------------------------------------------------------------
To enable the FULL Business-Grade Dictionary (3 Million Words):

1. Download the 'ecdict.csv' file from:
   https://github.com/skywind3000/ECDICT

2. Place 'ecdict.csv' in the root directory of this project:
   C:\ws	ranslation\ecdict.csv

3. Run the generation script again:
   npm run generate-dict

4. The extension will automatically detect the new file, 
   compress it (likely ~50MB -> ~8MB), and update the local database.

Current Status: Using "Google 10000 English" (High Frequency) word list.
-----------------------------------------------------------------------
`);
