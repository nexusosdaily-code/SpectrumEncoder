import { LETTER_WAVELENGTH } from "./constants";

const WORD_SEPARATOR = "\t";
const WAVELENGTH_SEPARATOR = " ";

export function textToWavelengthFormat(text: string): string {
  const upperText = text.toUpperCase();
  const words: string[] = [];
  
  let currentWord: number[] = [];
  
  for (const char of upperText) {
    if (char === ' ' || char === '\t' || char === '\n') {
      if (currentWord.length > 0) {
        words.push(currentWord.join(WAVELENGTH_SEPARATOR));
        currentWord = [];
      }
      continue;
    }
    
    if (/[A-Z]/.test(char)) {
      const wavelength = LETTER_WAVELENGTH[char];
      if (wavelength !== undefined) {
        currentWord.push(wavelength);
      }
    }
  }
  
  if (currentWord.length > 0) {
    words.push(currentWord.join(WAVELENGTH_SEPARATOR));
  }
  
  return words.join(WORD_SEPARATOR);
}

export function wavelengthFormatToText(encoded: string): string {
  if (!encoded || encoded.trim() === '') {
    return '';
  }
  
  const wavelengthToLetter: Record<number, string> = {};
  Object.entries(LETTER_WAVELENGTH).forEach(([letter, wavelength]) => {
    wavelengthToLetter[wavelength] = letter;
  });
  
  const words = encoded.split(WORD_SEPARATOR);
  const decodedWords: string[] = [];
  
  for (const word of words) {
    if (!word.trim()) continue;
    
    const wavelengths = word.split(WAVELENGTH_SEPARATOR).map(w => parseInt(w.trim(), 10));
    const letters: string[] = [];
    
    for (const wl of wavelengths) {
      if (isNaN(wl)) continue;
      
      const letter = wavelengthToLetter[wl];
      if (letter) {
        letters.push(letter);
      } else {
        letters.push('?');
      }
    }
    
    decodedWords.push(letters.join(''));
  }
  
  return decodedWords.join(' ');
}

export function isWavelengthFormat(text: string): boolean {
  if (!text || text.trim() === '') {
    return false;
  }
  
  const pattern = /^[\d\s\t]+$/;
  return pattern.test(text);
}
