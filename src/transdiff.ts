import fs from 'fs';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Define types
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

// Constants
const save = false;
const assetsDir = join(__dirname, '..', 'public', 'assets');
let referenceData: ReferenceData = {};
let checkData: CheckData[] = [];
let checkFilenames: string[] = [];
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
    console.log(`Loaded ${file} successfully`);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
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
fs.readdirSync('.').forEach(file => {
  if (path.extname(file) === '.html' || path.extname(file) === '.ts') {
    checkFilenames.push(file);
    try {
      const content = fs.readFileSync(file, 'utf8');
      console.log(`Read file ${file} successfully`);
      checkData.push({
        filename: file,
        keys: extractTranslationKeys(content),
      });
    } catch (err) {
      console.error(`Error reading or parsing ${file}:`, err);
    }
  }
});

// Extracts translation keys and returns them as an array
function extractTranslationKeys(content: string): string[] {
  const regex = /{{\s*"(.*?)"\s*\| translation }}/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

// Checking missing keys
checkData.forEach(({ filename, keys }) => {
  const missing = keys.filter(
    key => !Object.values(refKeys).flat().includes(key)
  );
  missingPaths.push({ filename, missing });
});

// Writing missing keys
missingPaths.forEach(({ filename, missing }) => {
  console.log(`Missing in ${filename}:`);
  console.log();
  printPaths(missing);
  console.log();
});

// Save to CSV file when const save = true;
if (save) {
  checkFilenames.forEach(filename => {
    const missingPathsForFile =
      missingPaths.find(mp => mp.filename === filename)?.missing || [];
    const csvFilename = filename.split('.')[0] + '.missing.csv';
    let missingKeysString = missingPathsForFile
      .map(key => `"${key}"`)
      .join(', ');
    let output = `${filename}: [${missingKeysString}]`;

    fs.writeFile(csvFilename, output, err => {
      if (err) console.log(err);
    });
  });
}