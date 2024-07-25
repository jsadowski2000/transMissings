const fs = require('fs');
const path = require('path');

const save = false;
let referenceData = {};
let checkData = [];
let checkFilenames = [];
let missingPaths = [];



function collectKeys(object, keys) {
  for (const key in object) {
    if (typeof object[key] === 'object') {
      collectKeys(object[key], keys);
    } else {
      keys.push(key);
    }
  }
}


function printPaths(paths) {
  paths.forEach(pVal => console.log('- ' + pVal));
}


const jsonFiles = ['en.json', 'pl.json', 'uk.json'];
jsonFiles.forEach(file => {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    referenceData[file] = data;
    console.log(`Loaded ${file} successfully`);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    process.exit(1);
  }
});


const refKeys = {};
for (const [file, data] of Object.entries(referenceData)) {
  refKeys[file] = [];
  collectKeys(data, refKeys[file]);
}


fs.readdirSync('.').forEach(file => {
  if (path.extname(file) === '.html' || path.extname(file) === '.ts') {
    checkFilenames.push(file);
    try {
      const content = fs.readFileSync(file, 'utf8');
      console.log(`Read file ${file} successfully`);
      checkData.push({
        filename: file,
        keys: extractTranslationKeys(content)
      });
    } catch (err) {
      console.error(`Error reading or parsing ${file}:`, err);
    }
  }
});


function extractTranslationKeys(content) {
  const regex = /{{\s*"(.*?)"\s*\| translation}}/g;
  const matches = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}


checkData.forEach(({filename, keys}) => {
  const missing = keys.filter(key => !Object.values(refKeys).flat().includes(key));
  missingPaths.push({filename, missing});
});


missingPaths.forEach(({filename, missing}) => {
  console.log(`Missing in ${filename}:`);
  console.log();
  printPaths(missing);
  console.log();
});

//save to csv options when const save = true;
if (save) {
  checkFilenames.forEach(filename => {
    const missingPathsForFile = missingPaths.find(mp => mp.filename === filename)?.missing || [];
    const csvFilename = filename.split('.')[0] + '.missing.csv';
    let missingKeysString = missingPathsForFile.map(key => `"${key}"`).join(', ');
    let output = `${filename}: [${missingKeysString}]`;

 

    fs.writeFile(csvFilename, output, err => {
      if (err) console.log(err);
    });
  });
}
