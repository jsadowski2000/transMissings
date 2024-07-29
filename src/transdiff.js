const fs = require("fs");
const path = require("path");

const save = true;
let referenceData = {};
let checkData = [];
let checkFilenames = [];
let missingPaths = [];

const assetsDir = path.join(__dirname, '..', 'src', 'assets', 'i18n');
const srcDir = path.join(__dirname, '..', 'src', 'app');
const outputDir = path.join(__dirname, '..');

//collecting all keys
function collectKeys(object, keys) {
  for (const key in object) {
    if (typeof object[key] === "object") {
      collectKeys(object[key], keys);
    } else {
      keys.push(key);
    }
  }
}

//printing all paths elements
function printPaths(paths) {
  paths.forEach((pVal) => console.log("- " + pVal));
}

// reading files with translations
const jsonFiles = ["en.json", "pl.json", "uk.json"];
jsonFiles.forEach((file) => {
  const filePath = path.join(assetsDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    referenceData[file] = data;
    console.log(`Loaded ${file} successfully`);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    process.exit(1);
  }
});

// collecting all keys from referenceData objects
const refKeys = {};
for (const [file, data] of Object.entries(referenceData)) {
  refKeys[file] = [];
  collectKeys(data, refKeys[file]);
  console.log(referenceData);
}

//reading file .html and .ts
function searchDirectory(directory) {
  fs.readdirSync(directory).forEach((file) => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      searchDirectory(fullPath);
    } else if (path.extname(fullPath) === '.html' || path.extname(fullPath) === '.ts') {
      checkFilenames.push(fullPath);
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        console.log(`Read file ${fullPath} successfully`);
        checkData.push({
          filename: fullPath,
          keys: extractTranslationKeys(content),
        });
      } catch (err) {
        console.error(`Error reading or parsing ${fullPath}:`, err);
      }
    }
  });
}

//extracts translation keys and return them as an array
function extractTranslationKeys(content) {
  const regex = /(?:{{\s*['"]?([^'"}\s]+)['"]?\s*\|\s*translate\s*}})|(?:['"]([^'"]+)['"]\s*\|\s*translate)|(?:\b([^\s|{}'"]+)\b\s*\|\s*translate)/g;
  const matches = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      matches.add(match[1].trim());
    } else if (match[2]) {
      matches.add(match[2].trim());
    } else if (match[3]) {
      matches.add(match[3].trim());
    }
  }
  console.log('Matches: ', matches)
  return Array.from(matches);
  
}

searchDirectory(srcDir);


//checking missing keys
checkData.forEach(({ filename, keys }) => {
  const missing = keys.filter(
    (key) => !Object.values(refKeys).flat().includes(key)
  );
  missingPaths.push({ filename, missing });
});

//writing missing keys
missingPaths.forEach(({ filename, missing }) => {
  console.log(`Missing in ${filename}:`);
  console.log();
  printPaths(missing);
  console.log();
});

//save to csv file when const save = true;
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
