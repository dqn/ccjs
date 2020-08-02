type Token =
  | {
      kind: 'reserved';
      str: string;
    }
  | {
      kind: 'num';
      str: string;
      val: number;
    };

type TokenKind = Token['kind'];

const tokens: Token[] = [];

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
    console.error('could not find %s', op);
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
    console.error('not a number');
    process.exit(1);
  }

  tokens.shift();

  return token.val;
}

function tokenize(src: string) {
  tokens.length = 0;

  while (src) {
    const c = src[0];

    if (!c.trim()) {
      src = src.slice(1);
      continue;
    }

    if (c === '+' || c === '-') {
      src = src.slice(1);
      tokens.push({ kind: 'reserved', str: c });
      continue;
    }

    if (!isNaN(parseInt(src))) {
      let val = 0;
      [val, src] = strtol(src);
      tokens.push({ kind: 'num', str: val.toString(), val });
      continue;
    }

    console.error('failed to tokenize');
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
        console.error('unexpected token: %s, %s', token.kind, token.str);
        process.exit(1);
      }
    }
  }

  console.log('  ret');
}
