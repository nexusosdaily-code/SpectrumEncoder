import { SPECTRUM_MAP, SOF, EOF, PREAMBLE_WHITE_MS, PREAMBLE_BLACK_MS, LETTER_WAVELENGTH } from "@shared/constants";
import { ColorSignalElement } from "@shared/schema";

export function encodeMessage(
  message: string,
  tsMs: number,
  tgMs: number
): ColorSignalElement[] {
  const elements: ColorSignalElement[] = [];

  // Preamble white
  elements.push({
    color: "#FFFFFF",
    duration: PREAMBLE_WHITE_MS,
    type: "preamble-white",
  });

  // Preamble black
  elements.push({
    color: "#000000",
    duration: PREAMBLE_BLACK_MS,
    type: "preamble-black",
  });

  // Start of Frame
  elements.push({
    color: SOF,
    letter: "SOF",
    duration: tsMs,
    type: "sof",
  });

  // Guard
  elements.push({
    color: "#000000",
    duration: tgMs,
    type: "guard",
  });

  // Encode each letter
  const upperMessage = message.toUpperCase();
  for (let i = 0; i < upperMessage.length; i++) {
    const char = upperMessage[i];
    
    // Skip non-alphabetic characters
    if (!/[A-Z]/.test(char)) continue;

    elements.push({
      color: SPECTRUM_MAP[char],
      letter: char,
      duration: tsMs,
      type: "letter",
      wavelengthNm: LETTER_WAVELENGTH[char],
    });

    // Guard interval after each letter (except last)
    if (i < upperMessage.length - 1 || upperMessage.length > 1) {
      elements.push({
        color: "#000000",
        duration: tgMs,
        type: "guard",
      });
    }
  }

  // End of Frame
  elements.push({
    color: EOF,
    letter: "EOF",
    duration: tsMs,
    type: "eof",
  });

  return elements;
}

export function calculateTotalDuration(elements: ColorSignalElement[]): number {
  return elements.reduce((sum, el) => sum + el.duration, 0);
}

export function decodeSignal(elements: ColorSignalElement[]): string {
  const letters = elements
    .filter(el => el.type === "letter" && el.letter)
    .map(el => el.letter)
    .join("");
  
  return letters;
}
