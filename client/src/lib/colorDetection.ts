import { LETTER_WAVELENGTH, WAVELENGTH_TO_LETTER, SOF, EOF, VISIBLE_MIN_NM, VISIBLE_MAX_NM, SPECTRUM_MAP } from "@shared/constants";
import { DIGIT_BRIGHTNESS_LEVELS, brightnessToDigit } from "@shared/encodingConfig";

/**
 * Convert RGB to LAB color space for perceptual color matching
 */
function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
  // Normalize RGB to 0-1
  let rNorm = r / 255;
  let gNorm = g / 255;
  let bNorm = b / 255;
  
  // Apply gamma correction
  rNorm = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
  gNorm = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
  bNorm = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;
  
  // Convert to XYZ
  let x = rNorm * 0.4124 + gNorm * 0.3576 + bNorm * 0.1805;
  let y = rNorm * 0.2126 + gNorm * 0.7152 + bNorm * 0.0722;
  let z = rNorm * 0.0193 + gNorm * 0.1192 + bNorm * 0.9505;
  
  // Normalize for D65 illuminant
  x = x / 0.95047;
  y = y / 1.00000;
  z = z / 1.08883;
  
  // Convert to LAB
  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
  
  return {
    l: (116 * y) - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

/**
 * Calculate perceptual color distance in LAB space (Delta E)
 */
function deltaE(lab1: { l: number; a: number; b: number }, lab2: { l: number; a: number; b: number }): number {
  const dL = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Build LAB lookup table for all spectrum colors
 */
const SPECTRUM_LAB_MAP: Record<string, { l: number; a: number; b: number }> = (() => {
  const map: Record<string, { l: number; a: number; b: number }> = {};
  
  Object.entries(LETTER_WAVELENGTH).forEach(([letter, _]) => {
    const hex = Object.keys(SPECTRUM_MAP).find(k => k === letter);
    if (hex) {
      const rgb = hexToRgb(SPECTRUM_MAP[hex]);
      if (rgb) {
        map[letter] = rgbToLab(rgb.r, rgb.g, rgb.b);
      }
    }
  });
  
  return map;
})();

/**
 * Find best matching letter based on perceptual color distance
 * More reliable than wavelength heuristics for camera detection
 */
export function detectLetterByColorMatch(r: number, g: number, b: number, maxDistance: number = 30): string | null {
  const detectedLab = rgbToLab(r, g, b);
  
  let bestLetter: string | null = null;
  let minDistance = maxDistance;
  
  Object.entries(SPECTRUM_LAB_MAP).forEach(([letter, targetLab]) => {
    const distance = deltaE(detectedLab, targetLab);
    if (distance < minDistance) {
      minDistance = distance;
      bestLetter = letter;
    }
  });
  
  return bestLetter;
}

/**
 * Convert RGB color to approximate wavelength (for display purposes)
 * Note: Use detectLetterByColorMatch for actual detection
 */
export function rgbToWavelength(r: number, g: number, b: number): number | null {
  const letter = detectLetterByColorMatch(r, g, b, 50);
  return letter ? LETTER_WAVELENGTH[letter] : null;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Find closest wavelength match with tolerance
 */
export function findClosestWavelength(detectedWavelength: number, tolerance: number = 15): number | null {
  const wavelengths = Object.values(LETTER_WAVELENGTH);
  let closest: number | null = null;
  let minDiff = Infinity;
  
  for (const wl of wavelengths) {
    const diff = Math.abs(wl - detectedWavelength);
    if (diff < minDiff && diff <= tolerance) {
      minDiff = diff;
      closest = wl;
    }
  }
  
  return closest;
}

/**
 * Detect letter from RGB color using perceptual color matching
 * More reliable than wavelength-based detection for camera input
 */
export function detectLetterFromRgb(r: number, g: number, b: number, maxDistance: number = 30): string | null {
  return detectLetterByColorMatch(r, g, b, maxDistance);
}

/**
 * Check if color is SOF marker (cyan)
 */
export function isSofColor(r: number, g: number, b: number, threshold: number = 30): boolean {
  const sofRgb = hexToRgb(SOF);
  if (!sofRgb) return false;
  
  return (
    Math.abs(r - sofRgb.r) < threshold &&
    Math.abs(g - sofRgb.g) < threshold &&
    Math.abs(b - sofRgb.b) < threshold
  );
}

/**
 * Check if color is EOF marker (magenta)
 */
export function isEofColor(r: number, g: number, b: number, threshold: number = 30): boolean {
  const eofRgb = hexToRgb(EOF);
  if (!eofRgb) return false;
  
  return (
    Math.abs(r - eofRgb.r) < threshold &&
    Math.abs(g - eofRgb.g) < threshold &&
    Math.abs(b - eofRgb.b) < threshold
  );
}

/**
 * Check if color is black (guard interval)
 */
export function isBlackColor(r: number, g: number, b: number, threshold: number = 40): boolean {
  return r < threshold && g < threshold && b < threshold;
}

/**
 * Check if color is white (preamble)
 */
export function isWhiteColor(r: number, g: number, b: number, threshold: number = 215): boolean {
  return r > threshold && g > threshold && b > threshold;
}

/**
 * Sample color from canvas at center point
 */
export function sampleCenterColor(
  canvas: HTMLCanvasElement,
  sampleSize: number = 20
): { r: number; g: number; b: number } | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  const centerX = Math.floor(canvas.width / 2);
  const centerY = Math.floor(canvas.height / 2);
  
  const halfSize = Math.floor(sampleSize / 2);
  const imageData = ctx.getImageData(
    centerX - halfSize,
    centerY - halfSize,
    sampleSize,
    sampleSize
  );
  
  let totalR = 0, totalG = 0, totalB = 0;
  const pixels = imageData.data.length / 4;
  
  for (let i = 0; i < imageData.data.length; i += 4) {
    totalR += imageData.data[i];
    totalG += imageData.data[i + 1];
    totalB += imageData.data[i + 2];
  }
  
  return {
    r: Math.round(totalR / pixels),
    g: Math.round(totalG / pixels),
    b: Math.round(totalB / pixels),
  };
}

/**
 * Detect brightness level from RGB (for digit pulse detection)
 * Returns normalized brightness 0.0-1.0
 */
export function detectBrightness(r: number, g: number, b: number): number {
  // Use perceived luminance formula (ITU-R BT.709)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Check if color appears to be grayscale (for digit pulse detection)
 * Grayscale colors have similar R, G, B values
 */
export function isGrayscale(r: number, g: number, b: number, tolerance: number = 20): boolean {
  const avg = (r + g + b) / 3;
  return (
    Math.abs(r - avg) < tolerance &&
    Math.abs(g - avg) < tolerance &&
    Math.abs(b - avg) < tolerance
  );
}

/**
 * Detect digit from brightness pulse
 * Returns digit 0-9 or null if no clear match
 */
export function detectDigitFromBrightness(r: number, g: number, b: number): number | null {
  // First check if it's grayscale (digit pulses are always grayscale)
  if (!isGrayscale(r, g, b, 25)) {
    return null;
  }
  
  const brightness = detectBrightness(r, g, b);
  return brightnessToDigit(brightness);
}

/**
 * Reconstruct wavelength from three detected digits
 */
export function reconstructWavelength(digit1: number, digit2: number, digit3: number): number {
  return digit1 * 100 + digit2 * 10 + digit3;
}

/**
 * Verify wavelength is in valid visible spectrum range
 */
export function isValidWavelength(wavelength: number): boolean {
  return wavelength >= VISIBLE_MIN_NM && wavelength <= VISIBLE_MAX_NM;
}
