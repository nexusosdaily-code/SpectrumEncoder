import { SPECTRUM_MAP } from '@shared/constants';

const VISIBLE_MIN_NM = 380;
const VISIBLE_MAX_NM = 740;

const LETTERS = Object.keys(SPECTRUM_MAP).sort(); // A..Z

// Precompute wavelength per letter
const LETTER_WAVELENGTH: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  const step = (VISIBLE_MAX_NM - VISIBLE_MIN_NM) / (LETTERS.length - 1);
  LETTERS.forEach((ch, idx) => {
    map[ch] = VISIBLE_MIN_NM + step * idx;
  });
  return map;
})();

export interface EncodedSymbol {
  char: string;
  hex: string;
  wavelengthNm: number;
  index: number;
}

declare const self: DedicatedWorkerGlobalScope;

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      message: err.message,
      name: err.name,
      stack: err.stack ?? null,
    };
  }
  if (err == null) {
    return {
      message: 'Worker error: value was null/undefined',
      primitiveValue: String(err),
    };
  }
  return {
    message: String(err),
    primitiveValue: String(err),
  };
}

function encodeText(text: string): EncodedSymbol[] {
  const result: EncodedSymbol[] = [];
  let idx = 0;

  for (const raw of text) {
    const upper = raw.toUpperCase();

    if (upper === ' ') {
      idx++;
      continue;
    }

    const hex = SPECTRUM_MAP[upper];
    const wavelengthNm = LETTER_WAVELENGTH[upper];

    if (!hex || wavelengthNm == null) {
      idx++;
      continue;
    }

    result.push({
      char: raw,
      hex,
      wavelengthNm,
      index: idx,
    });

    idx++;
  }

  return result;
}

self.onmessage = (event: MessageEvent) => {
  try {
    const data = event.data || {};
    const { type, payload } = data;

    if (type !== 'PROCESS_TEXT') return;

    const text = typeof payload?.text === 'string' ? payload.text : '';
    const encoded = encodeText(text);

    self.postMessage({
      type: 'TEXT_ENCODED',
      payload: { text, encoded },
    });
  } catch (err) {
    const error = serializeError(err);
    self.postMessage({
      type: 'WORKER_ERROR',
      error,
    });
  }
};

export {};
