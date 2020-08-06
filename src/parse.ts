import { errorAt } from './error';
import { Token } from './tokenize';

export type AstNode =
  | {
      kind: 'add' | 'sub' | 'mul' | 'div' | 'equ' | 'neq' | 'lss' | 'leq' | 'assign';
      lhs: AstNode;
      rhs: AstNode;
    }
  | {
      kind: 'return';
      lhs: AstNode;
    }
  | {
      kind: 'if';
      cond: AstNode;
      caseTrue: AstNode;
      caseFalse?: AstNode;
    }
  | {
      kind: 'lvar';
      offset: number;
    }
  | {
      kind: 'num';
      val: number;
    };

type LVar = {
  [name: string]: { offset: number };
};

// program    = stmt*
// stmt       = expr ";"
//              | "return" expr ";"
//              | "if" "(" expr ")" stmt ("else" stmt)?
// expr       = assign
// assign     = equality ("=" assign)?
// equality   = relational ("==" relational | "!=" relational)*
// relational = add ("<" add | "<=" add | ">" add | ">=" add)*
// add        = mul ("+" mul | "-" mul)*
// mul        = unary ("*" unary | "/" unary)*
// unary      = ("+" | "-")? primary
// primary    = num | ident | "(" expr ")"

export function parse(tokens: Token[]): AstNode[] {
  const locals: LVar = {};

  const consume = (op: string): boolean => {
    if (!tokens.length) {
      throw Error('there are no tokens');
    }

    const token = tokens[0];

    if (token.kind !== 'reserved' || token.str !== op) {
      return false;
    }

    tokens.shift();

    return true;
  };

  const consumeKind = (kind: string): boolean => {
    if (!tokens.length) {
      throw Error('there are no tokens');
    }

    const token = tokens[0];

    if (token.kind !== kind) {
      return false;
    }

    tokens.shift();

    return true;
  };

  const expect = (op: string) => {
    if (!tokens.length) {
      throw Error('there are no tokens');
    }

    const token = tokens[0];

    if (token.kind !== 'reserved' || token.str !== op) {
      errorAt(token.pos, 'could not find %s', op);
      process.exit(1);
    }

    tokens.shift();
  };

  const expectNumber = (): number => {
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
  };

  const primary = (): AstNode => {
    if (consume('(')) {
      const node = expr();
      expect(')');
      return node;
    }

    if (tokens[0].kind === 'ident') {
      const { str } = tokens[0];

      if (!locals[str]) {
        const offset = (Object.keys(locals).length + 1) * 8;
        locals[str] = { offset };
      }

      tokens.shift();

      return { kind: 'lvar', offset: locals[str].offset };
    }

    return { kind: 'num', val: expectNumber() };
  };

  const unary = (): AstNode => {
    if (consume('+')) {
      return primary();
    }
    if (consume('-')) {
      return { kind: 'sub', lhs: { kind: 'num', val: 0 }, rhs: primary() };
    }
    return primary();
  };

  const mul = (): AstNode => {
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
  };

  const add = (): AstNode => {
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
  };

  const relational = (): AstNode => {
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
  };

  const equality = (): AstNode => {
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
  };

  const assign = (): AstNode => {
    const node = equality();

    if (consume('=')) {
      return { kind: 'assign', lhs: node, rhs: assign() };
    } else {
      return node;
    }
  };

  const expr = (): AstNode => {
    return assign();
  };

  const stmt = (): AstNode => {
    if (consumeKind('return')) {
      const node: AstNode = { kind: 'return', lhs: expr() };
      expect(';');
      return node;
    }

    if (consumeKind('if')) {
      expect('(');
      const cond = expr();
      expect(')');

      const node: AstNode = { kind: 'if', cond, caseTrue: stmt() };

      if (consumeKind('else')) {
        node.caseFalse = stmt();
      }

      return node;
    }

    const node = expr();
    expect(';');
    return node;
  };

  const program = (): AstNode[] => {
    const nodes: AstNode[] = [];
    while (tokens[0].kind !== 'eof') {
      nodes.push(stmt());
    }
    return nodes;
  };

  return program();
}
