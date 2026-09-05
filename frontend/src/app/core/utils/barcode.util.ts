/**
 * Pure TypeScript Code 128 (Type B) Barcode Generator for SVG rendering.
 * Generates accurate standard Code 128 barcodes without external dependencies.
 */

const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (104=Start B, 106=Stop)
];

export interface BarcodeBar {
  x: number;
  width: number;
}

export class BarcodeGenerator {
  /**
   * Generates Code 128B binary bars for a given text.
   * Returns an array of bar positions and widths, and the total width.
   */
  static generateCode128(text: string, barWidth: number = 2): { bars: BarcodeBar[]; totalWidth: number } {
    const cleanText = text || '000000';
    const values: number[] = [];
    
    // Start with Code 128 Set B (104)
    values.push(104);
    let checksum = 104;

    for (let i = 0; i < cleanText.length; i++) {
      const code = cleanText.charCodeAt(i) - 32;
      const validCode = code >= 0 && code <= 95 ? code : 0;
      values.push(validCode);
      checksum += validCode * (i + 1);
    }

    // Add Checksum
    const checkDigit = checksum % 103;
    values.push(checkDigit);

    // Add Stop pattern (106)
    values.push(106);

    // Convert values to bar string pattern
    let patternStr = '';
    for (const val of values) {
      patternStr += CODE128_PATTERNS[val] || '212222';
    }

    // Generate x positions
    const bars: BarcodeBar[] = [];
    let currentX = 0;
    let isBar = true;

    for (let i = 0; i < patternStr.length; i++) {
      const count = parseInt(patternStr[i], 10) * barWidth;
      if (isBar) {
        bars.push({ x: currentX, width: count });
      }
      currentX += count;
      isBar = !isBar;
    }

    return { bars, totalWidth: currentX };
  }
}
