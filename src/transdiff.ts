import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

interface ReferenceData {
  [key: string]: any;
}

interface CheckData {
  filename: string;
  keys: string[];
}

interface MissingPath {
  filename: string;
  missing: string[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const save = true; // true if you want save it in csv
const assetsDir = path.join(__dirname, '..', 'src', 'assets', 'i18n');
const srcDir = path.join(__dirname, '..', 'src', 'app');
const outputDir = path.join(__dirname, '..');
let referenceData: ReferenceData = {};
let checkData: CheckData[] = [];
let missingPaths: MissingPath[] = [];

// Collecting all keys
function collectKeys(object: any, keys: string[]): void {
  for (const key in object) {
    if (object[key] && typeof object[key] === 'object') {
      collectKeys(object[key], keys);
    } else {
      keys.push(key);
    }
  }
}

// Printing all paths elements
function printPaths(paths: string[]): void {
  paths.forEach(pVal => console.log('- ' + pVal));
}

// Reading files with translations
const jsonFiles: string[] = ['en.json', 'pl.json', 'uk.json'];
jsonFiles.forEach(file => {
  const filePath = path.join(assetsDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    referenceData[file] = data;
    // console.log(`Loaded ${file} successfully`);
  } catch (err) {
    // console.error(`Error reading ${file}:`, err);
    process.exit(1);
  }
});

// Collecting all keys from referenceData objects
const refKeys: { [file: string]: string[] } = {};
for (const [file, data] of Object.entries(referenceData)) {
  refKeys[file] = [];
  collectKeys(data, refKeys[file]);
}

// Reading .html and .ts files
function readFiles(dir: string): void {
  // console.log(`Reading directory: ${dir}`);
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      readFiles(fullPath);
    } else if (entry.isFile() && (path.extname(entry.name) === '.html' || path.extname(entry.name) === '.ts')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        checkData.push({
          filename: fullPath,
          keys: extractTranslationKeys(content),
        });
      } catch (err) {
        console.error(`Error reading ${fullPath}:`, err);
      }
    }
  });
}

// Extracts translation keys and returns them as an array
function extractTranslationKeys(content: string): string[] {
  const regex = /(?:{{\s*['"]?([^'"}\s]+)['"]?\s*\|\s*translate\s*}})|(?:['"]([^'"]+)['"]\s*\|\s*translate)|(?:\b([^\s|{}'"]+)\b\s*\|\s*translate)/g;
  const matches: Set<string> = new Set();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      matches.add(match[1].trim());
    } else if (match[2]) {
      matches.add(match[2].trim());
    } else if (match[3]) {
      matches.add(match[3].trim());
    }
  }
  return Array.from(matches);
}

readFiles(srcDir);

// Checking missing keys
missingPaths = checkData.map(({ filename, keys }) => {
  const missing = keys.filter(
    key => !Object.values(refKeys).flat().includes(key)
  );
  return { filename, missing };
}).filter(({ missing }) => missing.length > 0); 

// Printing missing keys
if (missingPaths.length > 0) {
  missingPaths.forEach(({ filename, missing }) => {
    console.log('\n', `Missing in ${filename}:`, '\n');
    printPaths(missing);
  });
} else {
  console.log('No missing keys found.');
}

// Writing missing keys to CSV file
if (save && missingPaths.length > 0) {
  const csvFilename = path.join(outputDir, 'missing_keys_report.csv');
  const csvContent = [
    ['Filename', 'Missing Keys'].join(', '), // CSV header
    '', 
    ...missingPaths.flatMap(({ filename, missing }) => {
      const rows = [`"${filename}"`];
      if (missing.length > 0) {
        rows.push(...missing.map(key => `"${key}"`));
      }
      rows.push('');
      return rows;
    })
  ].map(row => row).join('\n');

  fs.writeFile(csvFilename, csvContent, err => {
    if (err) console.error(`Error writing ${csvFilename}:`, err);
    else console.log(`All missing keys saved to ${csvFilename}`);
  });
}
