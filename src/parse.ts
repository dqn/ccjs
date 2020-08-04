import { errorAt } from './error';
import { Token } from './tokenize';

export type AstNode =
  | {
      kind: 'add' | 'sub' | 'mul' | 'div' | 'equ' | 'neq' | 'lss' | 'leq';
      lhs: AstNode;
      rhs: AstNode;
    }
  | {
      kind: 'num';
      val: number;
    };

// expr       = equality
// equality   = relational ("==" relational | "!=" relational)*
// relational = add ("<" add | "<=" add | ">" add | ">=" add)*
// add        = mul ("+" mul | "-" mul)*
// mul        = unary ("*" unary | "/" unary)*
// unary      = ("+" | "-")? primary
// primary    = num | "(" expr ")"

export function parse(tokens: Token[]): AstNode {
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

  const expr = (): AstNode => {
    return equality();
  };

  return expr();
}
