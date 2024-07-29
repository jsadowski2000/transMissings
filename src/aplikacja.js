import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sciezkaKatalogu = path.join(__dirname, "assets", "i18n");

async function czytajJSON(sciezkaPliku) {
  const data = await fs.readFile(sciezkaPliku, "utf8");
  return JSON.parse(data);
}

async function zapiszJSON(sciezkaPliku, dane) {
  await fs.writeFile(sciezkaPliku, JSON.stringify(dane, null, 2), "utf8");
}

function sortujKluczeJSON(dane) {
  const posortowanyJSON = {};
  Object.keys(dane)
    .sort()
    .forEach((klucz) => {
      posortowanyJSON[klucz] = dane[klucz];
    });
  return posortowanyJSON;
}

async function znajdzIWypiszBrakujaceWartosci(pliki, wszystkieKlucze) {
  let brakujaceWartosci = {};

  pliki.forEach((plik) => {
    brakujaceWartosci[plik] = {};
    Object.entries(wszystkieKlucze[plik]).forEach(([klucz, wartosc]) => {
      if (wartosc === "") {
        brakujaceWartosci[plik][klucz] = wartosc;
      }
    });
  });

  return brakujaceWartosci;
}

async function znajdzIWypiszBrakujaceKlucze(pliki, wszystkieKlucze) {
  let brakujaceKlucze = {};
  let brakujaceWartosci = {};

  pliki.forEach((plik) => {
    brakujaceKlucze[plik] = {};
    brakujaceWartosci[plik] = {};

    let kluczeBiezacegoPliku = new Set(Object.keys(wszystkieKlucze[plik]));

    pliki.forEach((innyPlik) => {
      if (plik !== innyPlik) {
        Object.keys(wszystkieKlucze[innyPlik]).forEach((klucz) => {
          if (!kluczeBiezacegoPliku.has(klucz)) {
            brakujaceKlucze[plik][klucz] = wszystkieKlucze[innyPlik][klucz];
          }
        });

        Object.entries(wszystkieKlucze[innyPlik]).forEach(([klucz, wartosc]) => {
          if (wartosc === "") {
            brakujaceWartosci[plik][klucz] = wartosc;
          }
        });
      }
    });
  });

  return { brakujaceKlucze, brakujaceWartosci };
}

async function wykonajPorownanie() {
  try {
    const pliki = await fs.readdir(sciezkaKatalogu);
    const plikiJson = pliki.filter((plik) => path.extname(plik) === ".json");
    const wszystkieKlucze = {};

    // Wczytywanie danych z plików JSON
    for (const plik of plikiJson) {
      const sciezkaPliku = path.join(sciezkaKatalogu, plik);
      wszystkieKlucze[plik] = await czytajJSON(sciezkaPliku);
    }

    // Znajdowanie brakujących kluczy i wartości
    const brakujaceKluczeIWartosci = await znajdzIWypiszBrakujaceKlucze(plikiJson, wszystkieKlucze);
    const brakujaceWartosci = await znajdzIWypiszBrakujaceWartosci(plikiJson, wszystkieKlucze);
    const { brakujaceKlucze } = brakujaceKluczeIWartosci;

    console.log("\nBrakujace wartosci:");
    // Wypisanie brakujących kluczy i wartości po zakończeniu iteracji
    plikiJson.forEach((plik) => {
      if (Object.keys(brakujaceKlucze[plik]).length > 0) {
        console.log(`\nW pliku ${plik}:`);
    
        Object.entries(brakujaceKlucze[plik]).forEach(([klucz]) => {
          console.log(`  ${klucz}, brakująca wartość`);
        });
      }
    });

    console.log("\nPuste wartości:");
    plikiJson.forEach((plik) => {
      if (Object.keys(brakujaceWartosci[plik]).length > 0) {
        console.log(`\nW pliku ${plik}:`);
    
        Object.keys(brakujaceWartosci[plik]).forEach((klucz) => {
          console.log(`  ${klucz}, pusta wartość`);
        });
      }
    });
    
    // Dodawanie brakujących kluczy do plików i sortowanie wszystkich plików
    for (const plik of plikiJson) {
      let zmodyfikowano = Object.keys(brakujaceKlucze[plik]).length > 0 || Object.keys(brakujaceWartosci[plik]).length > 0;
      if (zmodyfikowano) {
        Object.entries(brakujaceKlucze[plik]).forEach(([klucz]) => {
          wszystkieKlucze[plik][klucz] = "";
        });
        Object.keys(brakujaceWartosci[plik]).forEach((klucz) => {
          if (brakujaceWartosci[plik][klucz] === "") {
            wszystkieKlucze[plik][klucz] = brakujaceWartosci[plik][klucz];
          }
        });

        const posortowaneDane = sortujKluczeJSON(wszystkieKlucze[plik]);
        await zapiszJSON(path.join(sciezkaKatalogu, plik), posortowaneDane);
        console.log(`\nZaktualizowano i posortowano plik ${plik}.`);
      }
    }
  } catch (error) {
    console.error("Wystąpił błąd:", error);
  }
}

wykonajPorownanie();
