import { SPECTRUM_MAP, SOF, EOF, PREAMBLE_WHITE_MS, PREAMBLE_BLACK_MS, LETTER_WAVELENGTH } from "@shared/constants";
import { ColorSignalElement } from "@shared/schema";
import { wavelengthToDigits, getDigitBrightness, PULSE_TIMING, CALIBRATION_REFERENCES } from "@shared/encodingConfig";

// Generate calibration sequence
export function generateCalibrationSequence(): ColorSignalElement[] {
  const elements: ColorSignalElement[] = [];
  
  // White reference
  elements.push({
    color: "#FFFFFF",
    duration: PULSE_TIMING.CALIBRATION_WHITE_MS,
    type: 'calibration-white',
  });
  
  // Black reference
  elements.push({
    color: "#000000",
    duration: PULSE_TIMING.CALIBRATION_BLACK_MS,
    type: 'calibration-black',
  });
  
  // Known wavelength references for calibration
  CALIBRATION_REFERENCES.forEach((ref) => {
    elements.push({
      color: ref.color,
      letter: ref.letter,
      wavelengthNm: ref.wavelength,
      duration: PULSE_TIMING.CALIBRATION_REFERENCE_MS,
      type: 'calibration-ref',
    });
    
    // Black gap between references
    elements.push({
      color: "#000000",
      duration: 100,
      type: 'mini-guard',
    });
  });
  
  return elements;
}

// Convert brightness level (0-1) to grayscale hex color
function brightnessToColor(brightness: number): string {
  const value = Math.round(brightness * 255);
  const hex = value.toString(16).padStart(2, '0');
  return `#${hex}${hex}${hex}`;
}

export function encodeMessage(
  message: string,
  tsMs: number,
  tgMs: number,
  includeCalibration = false
): ColorSignalElement[] {
  const elements: ColorSignalElement[] = [];

  // Optional calibration sequence at the start
  if (includeCalibration) {
    elements.push(...generateCalibrationSequence());
  }

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

  // Encode each letter with digit pulses
  const upperMessage = message.toUpperCase();
  for (let i = 0; i < upperMessage.length; i++) {
    const char = upperMessage[i];
    
    // Skip non-alphabetic characters
    if (!/[A-Z]/.test(char)) continue;

    const wavelengthNm = LETTER_WAVELENGTH[char];

    // Main letter signal (color flash)
    elements.push({
      color: SPECTRUM_MAP[char],
      letter: char,
      duration: tsMs,
      type: "letter",
      wavelengthNm,
    });

    // Encode wavelength as 3 digit pulses (hundreds, tens, ones)
    const [d1, d2, d3] = wavelengthToDigits(wavelengthNm);
    
    // Digit 1 (hundreds)
    elements.push({
      color: brightnessToColor(getDigitBrightness(d1)),
      duration: PULSE_TIMING.DIGIT_PULSE_MS,
      type: 'digit-pulse',
      digitValue: d1,
      brightness: getDigitBrightness(d1),
    });
    
    elements.push({
      color: "#000000",
      duration: PULSE_TIMING.MINI_GUARD_MS,
      type: 'mini-guard',
    });
    
    // Digit 2 (tens)
    elements.push({
      color: brightnessToColor(getDigitBrightness(d2)),
      duration: PULSE_TIMING.DIGIT_PULSE_MS,
      type: 'digit-pulse',
      digitValue: d2,
      brightness: getDigitBrightness(d2),
    });
    
    elements.push({
      color: "#000000",
      duration: PULSE_TIMING.MINI_GUARD_MS,
      type: 'mini-guard',
    });
    
    // Digit 3 (ones)
    elements.push({
      color: brightnessToColor(getDigitBrightness(d3)),
      duration: PULSE_TIMING.DIGIT_PULSE_MS,
      type: 'digit-pulse',
      digitValue: d3,
      brightness: getDigitBrightness(d3),
    });

    // Guard interval after each letter
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
