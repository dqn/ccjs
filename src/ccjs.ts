type Token =
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

type TokenKind = Token['kind'];

let userInput = '';
const tokens: Token[] = [];

function errorAt(pos: number, fmt: string, ...args: unknown[]) {
  console.error(userInput);
  console.error(`${' '.repeat(pos)}^ ${fmt}`, ...args);
}

function strtol(str: string): [number, string] {
  const n = parseInt(str);

  if (isNaN(n)) {
    return [0, str];
  }

  return [n, str.replace(n.toString(), '')];
}

function consume(op: string): boolean {
  if (!tokens.length) {
    throw Error('there are no tokens');
  }

  const token = tokens[0];

  if (token.kind !== 'reserved' || token.str[0] !== op) {
    return false;
  }

  tokens.shift();

  return true;
}

function expect(op: string) {
  if (!tokens.length) {
    throw Error('there are no tokens');
  }

  const token = tokens[0];

  if (token.kind !== 'reserved' || token.str[0] !== op) {
    errorAt(token.pos, 'could not find %s', op);
    process.exit(1);
  }

  tokens.shift();
}

function expectNumber(): number {
  if (!tokens.length) {
    throw Error('there are no tokens');
  }

  const token = tokens[0];

  if (token.kind !== 'num') {
    errorAt(token.pos, 'not a number');
    process.exit(1);
  }

  tokens.shift();

  return token.val;
}

function tokenize(src: string) {
  tokens.length = 0;
  userInput = src;
  let cur = src;

  while (cur) {
    const pos = userInput.length - cur.length;
    const c = cur[0];

    if (!c.trim()) {
      cur = cur.slice(1);
      continue;
    }

    if (c === '+' || c === '-') {
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
}

export function compile(src: Buffer | string) {
  tokenize(src.toString());

  console.log('.intel_syntax noprefix');
  console.log('.globl main');
  console.log('main:');

  console.log('  mov rax, %d', expectNumber());

  while (tokens.length) {
    const token = tokens[0];

    switch (token.kind) {
      case 'reserved': {
        switch (token.str) {
          case '+': {
            consume('+');
            console.log('  add rax, %d', expectNumber());
            continue;
          }
          case '-': {
            consume('-');
            console.log('  sub rax, %d', expectNumber());
            continue;
          }
        }
      }
      default: {
        errorAt(token.pos, 'unexpected token: %s, %s', token.kind, token.str);
        process.exit(1);
      }
    }
  }

  console.log('  ret');
}
