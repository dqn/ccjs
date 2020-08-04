import { errorAt } from './error';

export type Token =
  | {
      kind: 'eof';
      pos: -1;
    }
  | {
      kind: 'reserved';
      str: string;
      pos: number;
    }
  | {
      kind: 'num';
      str: string;
      pos: number;
      val: number;
    };

function strtol(str: string): [number, string] {
  const n = parseInt(str);

  if (isNaN(n)) {
    return [0, str];
  }

  return [n, str.replace(n.toString(), '')];
}

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  const userInput = src;
  let cur = src;

  while (cur) {
    const pos = userInput.length - cur.length;
    const c = cur[0];
    const s = cur.slice(0, 2);

    if (!c.trim()) {
      cur = cur.slice(1);
      continue;
    }

    if (['==', '!=', '>=', '<='].includes(s)) {
      cur = cur.slice(2);
      tokens.push({ kind: 'reserved', str: s, pos });
      continue;
    }

    if (['+', '-', '*', '/', '(', ')', '>', '<'].includes(c)) {
      cur = cur.slice(1);
      tokens.push({ kind: 'reserved', str: c, pos });
      continue;
    }

    if (!isNaN(parseInt(cur))) {
      let val = 0;
      [val, cur] = strtol(cur);
      tokens.push({ kind: 'num', str: val.toString(), pos, val });
      continue;
    }

    errorAt(pos, 'failed to tokenize');
    process.exit(1);
  }

  tokens.push({ kind: 'eof', pos: -1 });

  return tokens;
}
