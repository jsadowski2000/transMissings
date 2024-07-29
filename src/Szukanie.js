import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function otworzPlikPlJson(sciezka) {
    const sciezkaDoPliku = sciezka || path.join(__dirname, 'pl.json');

    try {
        const data = await fs.readFile(sciezkaDoPliku, 'utf8');
        console.log(`Otworzono plik "${sciezkaDoPliku}".`);
        const kluczeZPliku = pobierzNazwyKluczy(data);
        const sciezkaFolderu = path.join(__dirname,  'app');

        const brakujaceKlucze = new Set(kluczeZPliku);
        await przeszukajPlikiISprawdzKlucze(sciezkaFolderu, kluczeZPliku, brakujaceKlucze);

        if (brakujaceKlucze.size > 0) {
            console.log('Nie znaleziono następujących kluczy:');
            brakujaceKlucze.forEach(klucz => {
                console.log(`- ${klucz}`);
            });
        } else {
            console.log('Wszystkie klucze z pliku zostały znalezione w plikach.');
        }
    } catch (err) {
        console.error(`Plik "${sciezkaDoPliku}" nie został otwarty poprawnie:`, err);
    }
}

function pobierzNazwyKluczy(data) {
    try {
        const json = JSON.parse(data);
        return Object.keys(json);
    } catch (error) {
        console.error('Błąd parsowania pliku JSON:', error);
        return [];
    }
}

async function przeszukajPlikiISprawdzKlucze(sciezkaFolderu, kluczeZPliku, brakujaceKlucze) {
    try {
        const pliki = await fs.readdir(sciezkaFolderu);

        await Promise.all(pliki.map(async (plik) => {
            const sciezkaPliku = path.join(sciezkaFolderu, plik);
            const stat = await fs.stat(sciezkaPliku);

            if (stat.isDirectory()) {
                await przeszukajPlikiISprawdzKlucze(sciezkaPliku, kluczeZPliku, brakujaceKlucze);
            } else if (stat.isFile()) {
                await sprawdzPlikISprawdzKlucze(sciezkaPliku, kluczeZPliku, brakujaceKlucze);
            }
        }));
    } catch (err) {
        console.error('Błąd odczytu folderu:', err);
    }
}

async function sprawdzPlikISprawdzKlucze(sciezkaPliku, kluczeZPliku, brakujaceKlucze) {
    try {
        const content = await fs.readFile(sciezkaPliku, 'utf8');

        kluczeZPliku.forEach(klucz => {
            const pattern1 = `\"${klucz}\"`;
            const pattern2 = `\'${klucz}\'`;

            if (content.includes(pattern1) || content.includes(pattern2)) {
                brakujaceKlucze.delete(klucz);
            }
        });
    } catch (err) {
        console.error(`Błąd odczytu pliku "${sciezkaPliku}":`, err);
    }
}

// Poprawiona ścieżka do pliku
otworzPlikPlJson('C:\\Users\\jakubs\\Desktop\\projekty\\translations-diff\\src\\assets\\i18n\\pl.json');
