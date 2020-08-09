import { errorAt } from './error';
import { Token } from './tokenize';

export type AstNode =
  | {
      kind: 'add' | 'sub' | 'mul' | 'div' | 'equ' | 'neq' | 'lss' | 'leq' | 'assign';
      lhs: AstNode;
      rhs: AstNode;
    }
  | {
      kind: 'deref' | 'addr';
      operand: AstNode;
    }
  | {
      kind: 'func';
      label: string;
      args: AstNode[];
      stmts: AstNode[];
    }
  | {
      kind: 'block';
      stmts: AstNode[];
    }
  | {
      kind: 'return';
      expr: AstNode;
    }
  | {
      kind: 'if';
      cond: AstNode;
      caseTrue: AstNode;
      caseFalse?: AstNode;
    }
  | {
      kind: 'while';
      cond: AstNode;
      whileTrue: AstNode;
    }
  | {
      kind: 'for';
      init?: AstNode;
      cond?: AstNode;
      after?: AstNode;
      whileTrue: AstNode;
    }
  | {
      kind: 'int';
    }
  | {
      kind: 'call';
      label: string;
      args: AstNode[];
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

// program    = func*
// func       = ident "(" (ident ("," ident)*)? ")" "{" stmt* "}"
// stmt       = expr ";"
//              | "{" stmt* "}"
//              | "return" expr ";"
//              | "if" "(" expr ")" stmt ("else" stmt)?
//              | "while" "(" expr ")" stmt
//              | "for" "(" expr? ";" expr? ";" expr? ")" stmt
//              | "int" ident ";"
// expr       = assign
// assign     = equality ("=" assign)?
// equality   = relational ("==" relational | "!=" relational)*
// relational = add ("<" add | "<=" add | ">" add | ">=" add)*
// add        = mul ("+" mul | "-" mul)*
// mul        = unary ("*" unary | "/" unary)*
// unary      = "+"? primary
//              | "-"? primary
//              | "*" unary
//              | "&" unary
// primary    = num | ident ( "(" (expr ("," expr)*)? ")" )? | "(" expr ")"

export function parse(tokens: Token[]): AstNode[] {
  const locals: LVar = {};

  const nextToken = (): Token => {
    if (!tokens.length) {
      throw Error('there are no tokens');
    }

    return tokens[0];
  };

  const shiftToken = (): Token => {
    if (!tokens.length) {
      throw Error('there are no tokens');
    }

    return tokens.shift()!;
  };

  const consume = (op: string): boolean => {
    const token = nextToken();

    if (token.kind !== 'reserved' || token.str !== op) {
      return false;
    }

    tokens.shift();

    return true;
  };

  const consumeKind = (kind: Token['kind']): boolean => {
    const token = nextToken();

    if (token.kind !== kind) {
      return false;
    }

    tokens.shift();

    return true;
  };

  const expect = (op: string): Token => {
    const token = shiftToken();

    if (token.kind !== 'reserved' || token.str !== op) {
      errorAt(token.pos, 'could not find %s', op);
    }

    return token;
  };

  const expectKind = <T extends Token['kind'], U extends Token = Extract<Token, { kind: T }>>(
    kind: T,
  ): U => {
    const token = shiftToken();

    if (token.kind !== kind) {
      errorAt(token.pos, 'expected %s', kind);
    }

    return token as U;
  };

  const primary = (): AstNode => {
    if (consume('(')) {
      const node = expr();
      expect(')');
      return node;
    }

    const token = shiftToken();

    if (token.kind === 'ident') {
      if (consume('(')) {
        const args: AstNode[] = [];

        if (!consume(')')) {
          while (true) {
            args.push(expr());

            if (!consume(',')) {
              expect(')');
              break;
            }
          }
        }

        return { kind: 'call', label: token.str, args };
      }

      if (!locals[token.str]) {
        errorAt(token.pos, 'undefined variable');
      }

      return { kind: 'lvar', offset: locals[token.str].offset };
    }

    if (token.kind === 'num') {
      return { kind: 'num', val: token.val };
    }

    errorAt(token.pos, 'unexpected token %s', token.kind);
  };

  const unary = (): AstNode => {
    if (consume('+')) {
      return primary();
    }
    if (consume('-')) {
      return { kind: 'sub', lhs: { kind: 'num', val: 0 }, rhs: primary() };
    }
    if (consume('*')) {
      return { kind: 'deref', operand: unary() };
    }
    if (consume('&')) {
      return { kind: 'addr', operand: unary() };
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
    if (consume('{')) {
      const node: AstNode = { kind: 'block', stmts: [] };
      while (!consume('}')) {
        node.stmts.push(stmt());
      }
      return node;
    }

    if (consumeKind('return')) {
      const node: AstNode = { kind: 'return', expr: expr() };
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

    if (consumeKind('while')) {
      expect('(');
      const cond = expr();
      expect(')');

      const node: AstNode = { kind: 'while', cond, whileTrue: stmt() };

      return node;
    }

    if (consumeKind('for')) {
      const node: AstNode = { kind: 'for', whileTrue: null! };
      expect('(');
      if (!consume(';')) {
        node.init = expr();
        expect(';');
      }
      if (!consume(';')) {
        node.cond = expr();
        expect(';');
      }
      if (!consume(')')) {
        node.after = expr();
        expect(')');
      }

      node.whileTrue = stmt();

      return node;
    }

    if (consumeKind('int')) {
      const token = expectKind('ident');
      expect(';');

      if (locals[token.str]) {
        errorAt(token.pos, 'duplicate definitions');
      }

      const offset = (Object.keys(locals).length + 1) * 8;
      locals[token.str] = { offset };

      return { kind: 'int' };
    }

    const node = expr();
    expect(';');
    return node;
  };

  const func = (): AstNode => {
    expectKind('int');
    const token = expectKind('ident');
    const label = token.str;

    expect('(');

    const args: AstNode[] = [];

    if (!consume(')')) {
      while (true) {
        expectKind('int');
        const token = expectKind('ident');

        if (!locals[token.str]) {
          const offset = (Object.keys(locals).length + 1) * 8;
          locals[token.str] = { offset };
        }

        args.push({ kind: 'lvar', offset: locals[token.str].offset });

        if (!consume(',')) {
          expect(')');
          break;
        }
      }
    }

    expect('{');

    const stmts: AstNode[] = [];
    while (!consume('}')) {
      stmts.push(stmt());
    }

    return { kind: 'func', label, args, stmts };
  };

  const program = (): AstNode[] => {
    const nodes: AstNode[] = [];
    while (tokens[0].kind !== 'eof') {
      nodes.push(func());
    }
    return nodes;
  };

  return program();
}
