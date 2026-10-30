// Text-mode ESC/POS. Printer model compatibility is verified during installation.
const ascii = (text) => String(text || '').replace(/₹/g, 'INR ').replace(/·/g, '/').normalize('NFKD').replace(/[^\x20-\x7e\n]/g, '?').replace(/\r/g, '');
function wrap(text, width) {
  return ascii(text).split('\n').flatMap((line) => {
    const lines = [];
    while (line.length > width) { let end = line.lastIndexOf(' ', width); if (end < width / 3) end = width; lines.push(line.slice(0, end)); line = line.slice(end).trimStart(); }
    lines.push(line); return lines;
  }).join('\n');
}
export function encodeEscPos(document) {
  if (!document || !Array.isArray(document.blocks) || document.blocks.length > 500) throw new Error('Invalid print document.');
  const width = document.paperWidth === '58mm' ? 32 : 48;
  const chunks = [Buffer.from([27, 64])];
  for (const block of document.blocks) {
    if (block.divider) { chunks.push(Buffer.from([27, 97, 0, 29, 33, 0, 27, 69, 0]), Buffer.from('-'.repeat(width) + '\n')); continue; }
    if (typeof block.text !== 'string' || block.text.length > 1200) throw new Error('Invalid print text.');
    chunks.push(Buffer.from([27, 97, { left: 0, center: 1, right: 2 }[block.align] || 0, 27, 69, block.bold ? 1 : 0, 29, 33, block.large ? 17 : 0]));
    chunks.push(Buffer.from(wrap(block.text, block.large ? Math.floor(width / 2) : width) + '\n', 'ascii'));
  }
  chunks.push(Buffer.from([29, 33, 0, 27, 69, 0, 27, 97, 0, 10, 10, 10]));
  if (document.autoCut) chunks.push(Buffer.from([29, 86, 66, 0]));
  return Buffer.concat(chunks);
}
