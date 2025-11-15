import { LETTER_WAVELENGTH } from "./constants";

const WORD_SEPARATOR = "\t";
const WAVELENGTH_SEPARATOR = " ";

// Extended character mapping beyond A-Z
// Using wavelengths outside the visible spectrum range (750-999) for special characters
const EXTENDED_CHAR_WAVELENGTH: Record<string, number> = {
  '0': 750, '1': 755, '2': 760, '3': 765, '4': 770,
  '5': 775, '6': 780, '7': 785, '8': 790, '9': 795,
  '.': 800, ',': 805, '!': 810, '?': 815, '-': 820,
  ':': 825, ';': 830, "'": 835, '"': 840, '(': 845,
  ')': 850, '@': 855, '#': 860, '$': 865, '%': 870,
  '&': 875, '*': 880, '+': 885, '=': 890, '/': 895,
};

// Create reverse lookup map (cached for performance)
const WAVELENGTH_TO_CHAR: Record<number, string> = (() => {
  const map: Record<number, string> = {};
  
  // Add letters A-Z
  Object.entries(LETTER_WAVELENGTH).forEach(([letter, wavelength]) => {
    map[wavelength] = letter;
  });
  
  // Add extended characters
  Object.entries(EXTENDED_CHAR_WAVELENGTH).forEach(([char, wavelength]) => {
    map[wavelength] = char;
  });
  
  return map;
})();

export function textToWavelengthFormat(text: string): string {
  if (!text || text.trim() === '') {
    return '';
  }
  
  const upperText = text.toUpperCase();
  const words: string[] = [];
  let currentWord: number[] = [];
  
  for (const char of text) {
    const upper = char.toUpperCase();
    
    // Handle word separators
    if (char === ' ' || char === '\t' || char === '\n') {
      if (currentWord.length > 0) {
        words.push(currentWord.join(WAVELENGTH_SEPARATOR));
        currentWord = [];
      }
      continue;
    }
    
    // Try letter mapping first (A-Z)
    let wavelength = LETTER_WAVELENGTH[upper];
    
    // If not a letter, try extended character mapping
    if (wavelength === undefined) {
      wavelength = EXTENDED_CHAR_WAVELENGTH[char];
    }
    
    // Add to current word if we found a mapping
    if (wavelength !== undefined) {
      currentWord.push(wavelength);
    }
    // Skip unsupported characters silently (alternative: could add placeholder)
  }
  
  // Add final word if any
  if (currentWord.length > 0) {
    words.push(currentWord.join(WAVELENGTH_SEPARATOR));
  }
  
  return words.join(WORD_SEPARATOR);
}

export function wavelengthFormatToText(encoded: string): string {
  if (!encoded || encoded.trim() === '') {
    return '';
  }
  
  const words = encoded.split(WORD_SEPARATOR);
  const decodedWords: string[] = [];
  
  for (const word of words) {
    if (!word.trim()) continue;
    
    const wavelengths = word.split(WAVELENGTH_SEPARATOR).map(w => parseInt(w.trim(), 10));
    const chars: string[] = [];
    
    for (const wl of wavelengths) {
      if (isNaN(wl)) continue;
      
      const char = WAVELENGTH_TO_CHAR[wl];
      if (char) {
        chars.push(char);
      } else {
        // Unknown wavelength - use placeholder
        chars.push('�');
      }
    }
    
    decodedWords.push(chars.join(''));
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

// Get list of supported characters for UI display
export function getSupportedCharacters(): string {
  const letters = Object.keys(LETTER_WAVELENGTH).sort().join('');
  const extended = Object.keys(EXTENDED_CHAR_WAVELENGTH).sort().join('');
  return `Letters: ${letters}\nNumbers & Symbols: ${extended}`;
}
