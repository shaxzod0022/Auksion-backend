const uzNumberToWords = (num) => {
  if (num === 0) return "nol";

  const units = ["", "bir", "ikki", "uch", "to'rt", "besh", "olti", "yetti", "sakkiz", "to'qqiz"];
  const tens = ["", "o'n", "yigirma", "o'ttiz", "qirq", "ellik", "oltmish", "yetmish", "sakson", "to'qson"];
  const thousands = ["", "ming", "million", "milliard", "trillion"];

  const convertThreeDigits = (n) => {
    let res = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h > 0) res += units[h] + " yuz ";
    if (t > 0) res += tens[t] + " ";
    if (u > 0) res += units[u] + " ";
    return res.trim();
  };

  let word = "";
  let i = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk > 0) {
      const chunkWord = convertThreeDigits(chunk);
      word = chunkWord + " " + thousands[i] + " " + word;
    }
    num = Math.floor(num / 1000);
    i++;
  }

  const result = word.trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
};

module.exports = uzNumberToWords;
