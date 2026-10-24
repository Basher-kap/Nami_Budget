/** Safe arithmetic evaluator (no eval). Supports + - × ÷ * / % ( ) and decimals. */
export function evaluate(expression: string): number {
  const src = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
  let pos = 0;
  const peek = () => src[pos];

  function expr(): number {
    let v = term();
    while (peek() === '+' || peek() === '-') {
      const op = src[pos++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function term(): number {
    let v = factor();
    while (peek() === '*' || peek() === '/') {
      const op = src[pos++];
      const r = factor();
      if (op === '/' && r === 0) throw new Error('Cannot divide by zero');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }
  function factor(): number {
    if (peek() === '-') { pos++; return -factor(); }
    if (peek() === '+') { pos++; return factor(); }
    let v: number;
    if (peek() === '(') {
      pos++;
      v = expr();
      if (peek() !== ')') throw new Error('Missing )');
      pos++;
    } else {
      const m = /^\d*\.?\d+|^\d+\./.exec(src.slice(pos));
      if (!m) throw new Error('Invalid expression');
      v = parseFloat(m[0]);
      pos += m[0].length;
    }
    while (peek() === '%') { pos++; v = v / 100; }
    return v;
  }

  if (!src) return 0;
  const result = expr();
  if (pos !== src.length) throw new Error('Invalid expression');
  if (!Number.isFinite(result)) throw new Error('Invalid expression');
  return Math.round(result * 1e10) / 1e10;
}
