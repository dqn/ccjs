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
      kind: 'return';
      pos: number;
    }
  | {
      kind: 'if';
      pos: number;
    }
  | {
      kind: 'else';
      pos: number;
    }
  | {
      kind: 'while';
      pos: number;
    }
  | {
      kind: 'for';
      pos: number;
    }
  | {
      kind: 'ident';
      str: string;
      pos: number;
    }
  | {
      kind: 'num';
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
  let cur = src;

  const consume = (str: string): boolean => {
    if (cur.slice(0, str.length) === str && !/\w/.test(cur[str.length])) {
      cur = cur.slice(str.length);
      return true;
    }

    return false;
  };

  while (cur) {
    const pos = src.length - cur.length;
    const s1 = cur.slice(0, 1);
    const s2 = cur.slice(0, 2);

    if (!s1.trim()) {
      cur = cur.slice(1);
      continue;
    }

    if (['==', '!=', '>=', '<='].includes(s2)) {
      cur = cur.slice(2);
      tokens.push({ kind: 'reserved', str: s2, pos });
      continue;
    }

    if (['+', '-', '*', '/', '(', ')', '>', '<', '=', ';'].includes(s1)) {
      cur = cur.slice(1);
      tokens.push({ kind: 'reserved', str: s1, pos });
      continue;
    }

    if (consume('return')) {
      tokens.push({ kind: 'return', pos });
      continue;
    }

    if (consume('if')) {
      tokens.push({ kind: 'if', pos });
      continue;
    }

    if (consume('else')) {
      tokens.push({ kind: 'else', pos });
      continue;
    }

    if (consume('while')) {
      tokens.push({ kind: 'while', pos });
      continue;
    }

    if (consume('for')) {
      tokens.push({ kind: 'for', pos });
      continue;
    }

    if (/[a-z_]/.test(s1)) {
      let str = '';

      while (/\w/.test(cur[0])) {
        str += cur.slice(0, 1);
        cur = cur.slice(1);
      }

      tokens.push({ kind: 'ident', str, pos });
      continue;
    }

    if (!isNaN(parseInt(cur))) {
      let val = 0;
      [val, cur] = strtol(cur);
      tokens.push({ kind: 'num', pos, val });
      continue;
    }

    errorAt(pos, 'failed to tokenize');
    process.exit(1);
  }

  tokens.push({ kind: 'eof', pos: -1 });

  return tokens;
}
