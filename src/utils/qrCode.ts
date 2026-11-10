export interface QrCodeOptions {
  size?: number;
  margin?: number;
  color?: string;
  bgColor?: string;
}

interface VersionSpec {
  version: number;
  size: number;
  ecLevel: 'M' | 'L';
  ecLevelBits: number; // M=0 (00), L=1 (01)
  totalDataCodewords: number;
  ecCodewordsPerBlock: number;
  g1Blocks: number;
  g1DataCw: number;
  g2Blocks: number;
  g2DataCw: number;
  alignmentCoords: number[];
  remainderBits: number;
}

// ISO/IEC 18004 Table 9 specs for Versions 1..9 (EC Level M, plus Version 9 Level L fallback)
const QR_VERSIONS: VersionSpec[] = [
  { version: 1, size: 21, ecLevel: 'M', ecLevelBits: 0, totalDataCodewords: 16, ecCodewordsPerBlock: 10, g1Blocks: 1, g1DataCw: 16, g2Blocks: 0, g2DataCw: 0, alignmentCoords: [], remainderBits: 0 },
  { version: 2, size: 25, ecLevel: 'M', ecLevelBits: 0, totalDataCodewords: 28, ecCodewordsPerBlock: 16, g1Blocks: 1, g1DataCw: 28, g2Blocks: 0, g2DataCw: 0, alignmentCoords: [6, 18], remainderBits: 7 },
  { version: 3, size: 29, ecLevel: 'M', ecLevelBits: 0, totalDataCodewords: 44, ecCodewordsPerBlock: 26, g1Blocks: 1, g1DataCw: 44, g2Blocks: 0, g2DataCw: 0, alignmentCoords: [6, 22], remainderBits: 7 },
  { version: 4, size: 33, ecLevel: 'M', ecLevelBits: 0, totalDataCodewords: 64, ecCodewordsPerBlock: 18, g1Blocks: 2, g1DataCw: 32, g2Blocks: 0, g2DataCw: 0, alignmentCoords: [6, 26], remainderBits: 7 },
  { version: 5, size: 37, ecLevel: 'M', ecLevelBits: 0, totalDataCodewords: 86, ecCodewordsPerBlock: 24, g1Blocks: 2, g1DataCw: 43, g2Blocks: 0, g2DataCw: 0, alignmentCoords: [6, 30], remainderBits: 7 },
  { version: 6, size: 41, ecLevel: 'M', ecLevelBits: 0, totalDataCodewords: 108, ecCodewordsPerBlock: 16, g1Blocks: 4, g1DataCw: 27, g2Blocks: 0, g2DataCw: 0, alignmentCoords: [6, 34], remainderBits: 7 },
  { version: 7, size: 45, ecLevel: 'M', ecLevelBits: 0, totalDataCodewords: 124, ecCodewordsPerBlock: 18, g1Blocks: 4, g1DataCw: 31, g2Blocks: 0, g2DataCw: 0, alignmentCoords: [6, 22, 38], remainderBits: 0 },
  { version: 8, size: 49, ecLevel: 'M', ecLevelBits: 0, totalDataCodewords: 154, ecCodewordsPerBlock: 22, g1Blocks: 2, g1DataCw: 38, g2Blocks: 2, g2DataCw: 39, alignmentCoords: [6, 24, 42], remainderBits: 0 },
  { version: 9, size: 53, ecLevel: 'M', ecLevelBits: 0, totalDataCodewords: 182, ecCodewordsPerBlock: 22, g1Blocks: 3, g1DataCw: 36, g2Blocks: 2, g2DataCw: 37, alignmentCoords: [6, 26, 46], remainderBits: 0 },
  { version: 9, size: 53, ecLevel: 'L', ecLevelBits: 1, totalDataCodewords: 232, ecCodewordsPerBlock: 30, g1Blocks: 2, g1DataCw: 116, g2Blocks: 0, g2DataCw: 0, alignmentCoords: [6, 26, 46], remainderBits: 0 },
];

// GF(256) with primitive polynomial 0x11d (x^8 + x^4 + x^3 + x^2 + 1)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function getGeneratorPoly(ecLength: number): number[] {
  let poly = [1];
  for (let i = 0; i < ecLength; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomonEc(data: number[], ecLength: number): number[] {
  const gen = getGeneratorPoly(ecLength);
  const res = new Array(data.length + ecLength).fill(0);
  for (let i = 0; i < data.length; i++) {
    res[i] = data[i];
  }
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return res.slice(data.length);
}

function utf8Bytes(text: string): number[] {
  if (typeof TextEncoder !== 'undefined') {
    return Array.from(new TextEncoder().encode(text));
  }
  const encoded = unescape(encodeURIComponent(text));
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    bytes.push(encoded.charCodeAt(i));
  }
  return bytes;
}

function computeFormatBits(ecLevelBits: number, maskPattern: number): number {
  const data = (ecLevelBits << 3) | maskPattern;
  let rem = data << 10;
  const poly = 0x537;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) {
      rem ^= poly << (i - 10);
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function computeVersionBits(version: number): number {
  let rem = version << 12;
  const poly = 0x1f25;
  for (let i = 17; i >= 12; i--) {
    if ((rem >> i) & 1) {
      rem ^= poly << (i - 12);
    }
  }
  return (version << 12) | rem;
}

function maskCondition(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return false;
  }
}

function calculatePenalty(matrix: boolean[][]): number {
  const size = matrix.length;
  let penalty = 0;

  // Rule 1: 5+ consecutive same-color modules in row or column
  for (let r = 0; r < size; r++) {
    let runRow = 1;
    let runCol = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) {
        runRow++;
      } else {
        if (runRow >= 5) penalty += 3 + (runRow - 5);
        runRow = 1;
      }
      if (matrix[c][r] === matrix[c - 1][r]) {
        runCol++;
      } else {
        if (runCol >= 5) penalty += 3 + (runCol - 5);
        runCol = 1;
      }
    }
    if (runRow >= 5) penalty += 3 + (runRow - 5);
    if (runCol >= 5) penalty += 3 + (runCol - 5);
  }

  // Rule 2: 2x2 same-color blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const color = matrix[r][c];
      if (
        matrix[r][c + 1] === color &&
        matrix[r + 1][c] === color &&
        matrix[r + 1][c + 1] === color
      ) {
        penalty += 3;
      }
    }
  }

  // Rule 3: 1:1:3:1:1 finder-like ratios with 4 light modules
  const isPattern = (arr: boolean[]): boolean => {
    const p1 = [true, false, true, true, true, false, true, false, false, false, false];
    const p2 = [false, false, false, false, true, false, true, true, true, false, true];
    return p1.every((v, idx) => arr[idx] === v) || p2.every((v, idx) => arr[idx] === v);
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      const rowSlice = matrix[r].slice(c, c + 11);
      if (isPattern(rowSlice)) penalty += 40;
      const colSlice: boolean[] = [];
      for (let k = 0; k < 11; k++) colSlice.push(matrix[c + k][r]);
      if (isPattern(colSlice)) penalty += 40;
    }
  }

  // Rule 4: Dark/light ratio balance
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) darkCount++;
    }
  }
  const percent = (darkCount * 100) / (size * size);
  const k = Math.floor(Math.abs(percent - 50) / 5);
  penalty += k * 10;

  return penalty;
}

/**
 * Generates an ISO/IEC 18004 compliant binary QR matrix (true = dark module, false = light module).
 */
export function generateQrMatrix(text: string): boolean[][] {
  let payloadBytes = utf8Bytes(text || '');

  // Select smallest QR Version capable of encoding payloadBytes in Byte mode (8-bit length)
  let spec = QR_VERSIONS[QR_VERSIONS.length - 1];
  for (const candidate of QR_VERSIONS) {
    // 4 bits mode + 8 bits length + payloadBytes.length * 8 <= totalDataCodewords * 8
    const maxBytes = candidate.totalDataCodewords - 2;
    if (payloadBytes.length <= maxBytes) {
      spec = candidate;
      break;
    }
  }

  // Clamp oversized strings to max Version 9-L capacity (230 bytes)
  const maxAllowedBytes = spec.totalDataCodewords - 2;
  if (payloadBytes.length > maxAllowedBytes) {
    payloadBytes = payloadBytes.slice(0, maxAllowedBytes);
  }

  // Build data bit stream: mode (0100), byte count (8 bits), data bytes, terminator (<=4 zeros)
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode
  pushBits(payloadBytes.length, 8);
  for (const b of payloadBytes) {
    pushBits(b, 8);
  }

  const totalDataBits = spec.totalDataCodewords * 8;
  const terminatorLen = Math.min(4, totalDataBits - bits.length);
  pushBits(0, terminatorLen);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    dataCodewords.push(byte);
  }

  // Pad codewords alternating 0xEC and 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (dataCodewords.length < spec.totalDataCodewords) {
    dataCodewords.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  // Split into blocks & calculate Reed-Solomon EC codewords
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;

  for (let b = 0; b < spec.g1Blocks; b++) {
    const block = dataCodewords.slice(offset, offset + spec.g1DataCw);
    offset += spec.g1DataCw;
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomonEc(block, spec.ecCodewordsPerBlock));
  }
  for (let b = 0; b < spec.g2Blocks; b++) {
    const block = dataCodewords.slice(offset, offset + spec.g2DataCw);
    offset += spec.g2DataCw;
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomonEc(block, spec.ecCodewordsPerBlock));
  }

  // Interleave data codewords, then EC codewords
  const finalCodewords: number[] = [];
  const maxDataLen = Math.max(spec.g1DataCw, spec.g2DataCw);
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) finalCodewords.push(block[i]);
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (const ec of ecBlocks) {
      if (i < ec.length) finalCodewords.push(ec[i]);
    }
  }

  const finalBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      finalBits.push((cw >> i) & 1);
    }
  }
  for (let i = 0; i < spec.remainderBits; i++) {
    finalBits.push(0);
  }

  // Initialize module grid & function mask
  const size = spec.size;
  const baseModules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunction = (r: number, c: number, val: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      baseModules[r][c] = val;
      isFunction[r][c] = true;
    }
  };

  // Place 7x7 finder pattern + 1-module light separator around it
  const placeFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const isDark =
          dr >= 0 &&
          dr <= 6 &&
          dc >= 0 &&
          dc <= 6 &&
          (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        setFunction(r, c, isDark);
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Place alignment patterns (Version >= 2)
  const coords = spec.alignmentCoords;
  for (const rCenter of coords) {
    for (const cCenter of coords) {
      const overlapsFinder =
        (rCenter <= 8 && cCenter <= 8) ||
        (rCenter <= 8 && cCenter >= size - 9) ||
        (rCenter >= size - 9 && cCenter <= 8);
      if (overlapsFinder) continue;

      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isDark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFunction(rCenter + dr, cCenter + dc, isDark);
        }
      }
    }
  }

  // Timing patterns (row 6, col 6)
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    if (!isFunction[6][i]) setFunction(6, i, dark);
    if (!isFunction[i][6]) setFunction(i, 6, dark);
  }

  // Dark module (4*version + 9, 8)
  setFunction(size - 8, 8, true);

  // Reserve Format Information modules
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setFunction(8, i, false);
    if (!isFunction[i][8]) setFunction(i, 8, false);
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) setFunction(8, i, false);
  }
  for (let i = size - 7; i < size; i++) {
    if (!isFunction[i][8]) setFunction(i, 8, false);
  }

  // Version Information (Version >= 7)
  if (spec.version >= 7) {
    const verBits = computeVersionBits(spec.version);
    for (let i = 0; i < 18; i++) {
      const bit = ((verBits >> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = size - 11 + (i % 3);
      setFunction(a, b, bit);
      setFunction(b, a, bit);
    }
  }

  // Place data codewords in zigzag pattern
  let bitIdx = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // Skip vertical timing column
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (const dc of [0, -1]) {
        const c = right + dc;
        if (!isFunction[r][c] && bitIdx < finalBits.length) {
          baseModules[r][c] = finalBits[bitIdx] === 1;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  // Evaluate all 8 mask patterns and select lowest penalty
  let bestMatrix: boolean[][] = baseModules;
  let bestPenalty = Infinity;

  const applyFormat = (mat: boolean[][], mask: number) => {
    const fmt = computeFormatBits(spec.ecLevelBits, mask);
    // Bits 0..5 -> (8,0..5), bit 6 -> (8,7), bit 7 -> (8,8), bit 8 -> (7,8), bits 9..14 -> (5..0,8)
    for (let i = 0; i < 15; i++) {
      // Bit index from MSB (bit 14 first) down to LSB (bit 0)
      const val = ((fmt >> (14 - i)) & 1) === 1;
      // Copy 1 (top-left)
      if (i < 6) mat[8][i] = val;
      else if (i === 6) mat[8][7] = val;
      else if (i === 7) mat[8][8] = val;
      else if (i === 8) mat[7][8] = val;
      else mat[14 - i][8] = val;

      // Copy 2 (bottom-left & top-right)
      if (i < 7) mat[size - 1 - i][8] = val;
      else mat[8][size - 15 + i] = val;
    }
  };

  for (let mask = 0; mask < 8; mask++) {
    const candidate = baseModules.map((row, r) =>
      row.map((val, c) => (isFunction[r][c] ? val : val !== maskCondition(mask, r, c)))
    );
    applyFormat(candidate, mask);
    const penalty = calculatePenalty(candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMatrix = candidate;
    }
  }

  return bestMatrix;
}

/**
 * Zero-dependency ISO/IEC 18004 scannable SVG QR Code generator.
 * Clamps size to [32, 1024] and margin to >= 0.
 */
export function generateValidQrCodeSvg(text: string, options?: QrCodeOptions): string {
  const rawSize = options?.size ?? 256;
  const size = Math.max(32, Math.min(1024, rawSize));
  const margin = Math.max(0, options?.margin ?? 4);
  const color = options?.color ?? '#10b981';
  const bgColor = options?.bgColor ?? '#09090b';

  const matrix = generateQrMatrix(text);
  const gridSize = matrix.length;
  const innerSize = Math.max(1, size - margin * 2);
  const cellSize = innerSize / gridSize;

  // Build crisp SVG path for all dark modules (no sub-pixel gaps)
  const paths: string[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (matrix[r][c]) {
        const x = (c * cellSize).toFixed(3);
        const y = (r * cellSize).toFixed(3);
        const nextX = ((c + 1) * cellSize).toFixed(3);
        const nextY = ((r + 1) * cellSize).toFixed(3);
        const w = (parseFloat(nextX) - parseFloat(x)).toFixed(3);
        const h = (parseFloat(nextY) - parseFloat(y)).toFixed(3);
        paths.push(`M${x},${y}h${w}v${h}h-${w}z`);
      }
    }
  }

  const safeDesc = String(text ?? '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR Code" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="${bgColor}"/>` +
    `<g fill="${color}" transform="translate(${margin},${margin})">` +
    `<path d="${paths.join('')}"/>` +
    `</g>` +
    `<desc>${safeDesc}</desc>` +
    `</svg>`
  );
}

/**
 * Backward-compatible alias exporting the ISO/IEC 18004 QR Code SVG generator.
 */
export function generateQrCodeSvg(text: string, options?: QrCodeOptions): string {
  return generateValidQrCodeSvg(text, options);
}

/**
 * 1-click clipboard utility with graceful fallback and error handling.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
    return false;
  } catch {
    return false;
  }
}

export default generateQrCodeSvg;
