/**
 * Enhanced encoding configuration with calibration and numeric pulse encoding
 */

// Calibration reference wavelengths for adaptive threshold learning
export const CALIBRATION_REFERENCES = [
  { wavelength: 400, letter: 'B', color: '#8B00FF', name: 'Violet' },
  { wavelength: 520, letter: 'N', color: '#00FF00', name: 'Green' },
  { wavelength: 640, letter: 'Y', color: '#FF0000', name: 'Red' },
] as const;

// Timing configuration for numeric pulse encoding
export const PULSE_TIMING = {
  // Duration of each digit pulse (brightness-encoded)
  DIGIT_PULSE_MS: 40,
  
  // Mini-guard between digit pulses
  MINI_GUARD_MS: 20,
  
  // Calibration frame durations
  CALIBRATION_WHITE_MS: 300,
  CALIBRATION_BLACK_MS: 300,
  CALIBRATION_REFERENCE_MS: 200,
  
  // Total overhead per letter: 3 digits × (40ms pulse + 20ms guard) = 180ms
  // This adds to the base TS duration
} as const;

// Brightness levels for digit encoding (0-9)
// Each digit is encoded as a brightness percentage
export const DIGIT_BRIGHTNESS_LEVELS = [
  0.05,  // 0 - very dim
  0.15,  // 1
  0.25,  // 2
  0.35,  // 3
  0.45,  // 4
  0.55,  // 5
  0.65,  // 6
  0.75,  // 7
  0.85,  // 8
  0.95,  // 9 - very bright
] as const;

// Convert wavelength (380-740) to 3-digit format
export function wavelengthToDigits(wavelength: number): [number, number, number] {
  const wl = Math.round(wavelength);
  const hundreds = Math.floor(wl / 100);
  const tens = Math.floor((wl % 100) / 10);
  const ones = wl % 10;
  return [hundreds, tens, ones];
}

// Convert 3 digits back to wavelength
export function digitsToWavelength(d1: number, d2: number, d3: number): number {
  return d1 * 100 + d2 * 10 + d3;
}

// Get brightness level for a digit
export function getDigitBrightness(digit: number): number {
  if (digit < 0 || digit > 9) return 0.5;
  return DIGIT_BRIGHTNESS_LEVELS[digit];
}

// Convert brightness to digit (inverse function)
export function brightnessToDigit(brightness: number): number {
  // Find closest brightness level
  let closest = 0;
  let minDiff = Math.abs(brightness - DIGIT_BRIGHTNESS_LEVELS[0]);
  
  for (let i = 1; i < DIGIT_BRIGHTNESS_LEVELS.length; i++) {
    const diff = Math.abs(brightness - DIGIT_BRIGHTNESS_LEVELS[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }
  
  return closest;
}

// Calibration data storage
export interface CalibrationData {
  whiteRGB: [number, number, number];
  blackRGB: [number, number, number];
  references: Array<{
    wavelength: number;
    expectedColor: string;
    detectedRGB: [number, number, number];
  }>;
  brightnessGain: number;
  brightnessOffset: number;
  timestamp: number;
}

// Confidence scoring
export interface DetectionConfidence {
  colorMatch: number;      // 0-100, based on LAB Delta E
  numericMatch: number;    // 0-100, based on digit clarity
  overall: number;         // Combined confidence score
  warning?: string;        // Warning if channels disagree
}
