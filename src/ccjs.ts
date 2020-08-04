type Token =
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

  if (token.kind !== 'reserved' || token.str !== op) {
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

  if (token.kind !== 'reserved' || token.str !== op) {
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
}

type AstNode =
  | {
      kind: 'add' | 'sub' | 'mul' | 'div' | 'equ' | 'neq' | 'lss' | 'leq';
      lhs: AstNode;
      rhs: AstNode;
    }
  | {
      kind: 'num';
      val: number;
    };

type AstNodeKind = AstNode['kind'];

// expr       = equality
// equality   = relational ("==" relational | "!=" relational)*
// relational = add ("<" add | "<=" add | ">" add | ">=" add)*
// add        = mul ("+" mul | "-" mul)*
// mul        = unary ("*" unary | "/" unary)*
// unary      = ("+" | "-")? primary
// primary    = num | "(" expr ")"

function primary(): AstNode {
  if (consume('(')) {
    const node = expr();
    expect(')');
    return node;
  }

  return { kind: 'num', val: expectNumber() };
}

function unary(): AstNode {
  if (consume('+')) {
    return primary();
  }
  if (consume('-')) {
    return { kind: 'sub', lhs: { kind: 'num', val: 0 }, rhs: primary() };
  }
  return primary();
}

function mul(): AstNode {
  let node = unary();

  while (true) {
    if (consume('*')) {
      node = { kind: 'mul', lhs: node, rhs: unary() };
    } else if (consume('/')) {
      node = { kind: 'div', lhs: node, rhs: unary() };
    } else {
      return node;
    }
  }
}

function add(): AstNode {
  let node = mul();

  while (true) {
    if (consume('+')) {
      node = { kind: 'add', lhs: node, rhs: mul() };
    } else if (consume('-')) {
      node = { kind: 'sub', lhs: node, rhs: mul() };
    } else {
      return node;
    }
  }
}

function relational(): AstNode {
  let node = add();

  while (true) {
    if (consume('<')) {
      node = { kind: 'lss', lhs: node, rhs: add() };
    } else if (consume('<=')) {
      node = { kind: 'leq', lhs: node, rhs: add() };
    } else if (consume('>')) {
      node = { kind: 'lss', lhs: add(), rhs: node };
    } else if (consume('>=')) {
      node = { kind: 'leq', lhs: add(), rhs: node };
    } else {
      return node;
    }
  }
}

function equality(): AstNode {
  let node = relational();

  while (true) {
    if (consume('==')) {
      node = { kind: 'equ', lhs: node, rhs: relational() };
    } else if (consume('!=')) {
      node = { kind: 'neq', lhs: node, rhs: relational() };
    } else {
      return node;
    }
  }
}

function expr(): AstNode {
  return equality();
}

function gen(node: AstNode) {
  if (node.kind === 'num') {
    console.log('  push %d', node.val);
    return;
  }

  gen(node.lhs);
  gen(node.rhs);

  console.log('  pop rdi');
  console.log('  pop rax');

  switch (node.kind) {
    case 'add': {
      console.log('  add rax, rdi');
      break;
    }
    case 'sub': {
      console.log('  sub rax, rdi');
      break;
    }
    case 'mul': {
      console.log('  imul rax, rdi');
      break;
    }
    case 'div': {
      console.log('  cqo');
      console.log('  idiv rdi');
      break;
    }
    case 'equ': {
      console.log('  cmp rax, rdi');
      console.log('  sete al');
      console.log('  movzb rax, al');
      break;
    }
    case 'neq': {
      console.log('  cmp rax, rdi');
      console.log('  setne al');
      console.log('  movzb rax, al');
      break;
    }
    case 'lss': {
      console.log('  cmp rax, rdi');
      console.log('  setl al');
      console.log('  movzb rax, al');
      break;
    }
    case 'leq': {
      console.log('  cmp rax, rdi');
      console.log('  setle al');
      console.log('  movzb rax, al');
      break;
    }
    default: {
      console.error('unexpected node kind: %s', node.kind);
      process.exit(1);
    }
  }

  console.log('  push rax');
}

export function compile(src: Buffer | string) {
  tokenize(src.toString());

  console.log('.intel_syntax noprefix');
  console.log('.globl main');
  console.log('main:');

  const node = expr();
  gen(node);

  console.log('  pop rax');
  console.log('  ret');
}
