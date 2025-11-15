export const SPECTRUM_MAP: Record<string, string> = {
  A:"#8B00FF",B:"#7B00FF",C:"#6B00FF",D:"#0050FF",E:"#0066FF",F:"#007BFF",
  G:"#0099FF",H:"#00B7FF",I:"#00D4FF",J:"#00F0FF",K:"#00FF66",L:"#66FF00",
  M:"#99FF00",N:"#CCFF00",O:"#FFFF00",P:"#FFD200",Q:"#FFAA00",R:"#FF6600",
  S:"#FF0000",T:"#E00000",U:"#C00020",V:"#A00040",W:"#800060",X:"#660080",
  Y:"#55008C",Z:"#440099"
};

export const SOF = "#00FFFF"; // cyan - Start of Frame
export const EOF = "#FF00FF"; // magenta - End of Frame

export const DEFAULT_TS_MS = 140; // symbol duration
export const DEFAULT_TG_MS = 30;  // guard black
export const PREAMBLE_WHITE_MS = 300;
export const PREAMBLE_BLACK_MS = 300;

// Wavelength mapping for camera detection
export const VISIBLE_MIN_NM = 380;
export const VISIBLE_MAX_NM = 740;

const LETTERS = Object.keys(SPECTRUM_MAP).sort(); // A..Z
const STEP_NM = (VISIBLE_MAX_NM - VISIBLE_MIN_NM) / (LETTERS.length - 1);

export const LETTER_WAVELENGTH: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  LETTERS.forEach((ch, idx) => {
    map[ch] = Math.round(VISIBLE_MIN_NM + STEP_NM * idx);
  });
  return map;
})();

// Reverse mapping for wavelength detection
export const WAVELENGTH_TO_LETTER: Record<number, string> = (() => {
  const map: Record<number, string> = {};
  Object.entries(LETTER_WAVELENGTH).forEach(([letter, wavelength]) => {
    map[wavelength] = letter;
  });
  return map;
})();
