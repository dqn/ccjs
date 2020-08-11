import { format } from 'util';

import { AstNode } from './parse';

function argRegisters(i: number): string {
  if (i > 5) {
    throw new Error('up to 6 arguments can be used');
  }

  const registers = ['rdi', 'rsi', 'rdx', 'rcx', 'r8', 'r9'];
  return registers[i];
}

export function generateCode(nodes: AstNode[]): string {
  const newLabel = ((): ((str: string) => string) => {
    let labelCount = 0;
    return (str) => str + labelCount++;
  })();

  const codes: string[] = [];
  const emmit = (fmt: string, ...params: any[]) => {
    codes.push(format(fmt, ...params));
  };

  const genLval = (node: AstNode) => {
    switch (node.kind) {
      case 'deref': {
        genLval(node.operand);
        emmit('  pop rax');
        emmit('  mov rax, [rax]');
        emmit('  push rax');
        return;
      }
      case 'lvar': {
        emmit('  mov rax, rbp');
        emmit('  sub rax, %d', node.offset);
        emmit('  push rax');
        return;
      }
    }

    console.error('not local variable');
    process.exit(1);
  };

  const gen = (node: AstNode) => {
    switch (node.kind) {
      case 'num': {
        emmit('  push %d', node.val);
        return;
      }
      case 'lvar': {
        genLval(node);
        emmit('  pop rax');
        emmit('  mov rax, [rax]');
        emmit('  push rax');
        return;
      }
      case 'assign': {
        genLval(node.lhs);
        gen(node.rhs);

        emmit('  pop rdi');
        emmit('  pop rax');
        emmit('  mov [rax], rdi');
        emmit('  push rdi');
        return;
      }
      case 'deref': {
        gen(node.operand);
        emmit('  pop rax');
        emmit('  mov rax, [rax]');
        emmit('  push rax');
        return;
      }
      case 'addr': {
        genLval(node.operand);
        return;
      }
      case 'call': {
        node.args.forEach((arg, i) => {
          gen(arg);
          emmit('  pop rax');
          emmit('  mov %s, rax', argRegisters(i));
        });

        emmit('  call %s', node.label);
        emmit('  push rax');
        return;
      }
      case 'func': {
        // allocate space for 26 variables.
        emmit(node.label + ':');
        emmit('  push rbp');
        emmit('  mov rbp, rsp');
        emmit('  sub rsp, 208');

        node.args.forEach((arg, i) => {
          genLval(arg);
          emmit('  pop rax');
          emmit('  mov [rax], %s', argRegisters(i));
        });

        node.stmts.forEach((stmt) => {
          gen(stmt);
          emmit('  pop rax');
        });

        emmit('  mov rsp, rbp');
        emmit('  pop rbp');
        emmit('  ret');
        return;
      }
      case 'block': {
        node.stmts.forEach((stmt) => {
          gen(stmt);
          emmit('  pop rax');
        });
        return;
      }
      case 'return': {
        gen(node.expr);
        emmit('  pop rax');
        emmit('  mov rsp, rbp');
        emmit('  pop rbp');
        emmit('  ret');
        return;
      }
      case 'if': {
        gen(node.cond);
        emmit('  pop rax');
        emmit('  cmp rax, 0');

        if (node.caseFalse) {
          const lelse = newLabel('.Lelse');
          const lend = newLabel('.Lend');
          emmit('  je %s', lelse);
          gen(node.caseTrue);
          emmit('  jmp %s', lend);
          emmit(lelse + ':');
          gen(node.caseFalse);
          emmit(lend + ':');
        } else {
          const lend = newLabel('.Lend');
          emmit('  je %s', lend);
          gen(node.caseTrue);
          emmit(lend + ':');
        }
        return;
      }
      case 'while': {
        const lbegin = newLabel('Lbegin');
        const lend = newLabel('Lend');
        emmit(lbegin + ':');
        gen(node.cond);
        emmit('  pop rax');
        emmit('  cmp rax, 0');
        emmit('  je %s', lend);
        gen(node.whileTrue);
        emmit('  jmp %s', lbegin);
        emmit(lend + ':');
        return;
      }
      case 'for': {
        const lbegin = newLabel('Lbegin');
        const lend = newLabel('Lend');
        if (node.init) {
          gen(node.init);
        }
        emmit(lbegin + ':');
        if (node.cond) {
          gen(node.cond);
          emmit('  pop rax');
          emmit('  cmp rax, 0');
          emmit('  je %s', lend);
        }
        gen(node.whileTrue);
        if (node.after) {
          gen(node.after);
        }
        emmit('  jmp %s', lbegin);
        emmit(lend + ':');
        return;
      }
    }

    gen(node.lhs);
    gen(node.rhs);

    emmit('  pop rdi');
    emmit('  pop rax');

    switch (node.kind) {
      case 'add': {
        emmit('  add rax, rdi');
        break;
      }
      case 'sub': {
        emmit('  sub rax, rdi');
        break;
      }
      case 'mul': {
        emmit('  imul rax, rdi');
        break;
      }
      case 'div': {
        emmit('  cqo');
        emmit('  idiv rdi');
        break;
      }
      case 'equ': {
        emmit('  cmp rax, rdi');
        emmit('  sete al');
        emmit('  movzb rax, al');
        break;
      }
      case 'neq': {
        emmit('  cmp rax, rdi');
        emmit('  setne al');
        emmit('  movzb rax, al');
        break;
      }
      case 'lss': {
        emmit('  cmp rax, rdi');
        emmit('  setl al');
        emmit('  movzb rax, al');
        break;
      }
      case 'leq': {
        emmit('  cmp rax, rdi');
        emmit('  setle al');
        emmit('  movzb rax, al');
        break;
      }
      default: {
        console.error('unexpected node kind: %s', node.kind);
        process.exit(1);
      }
    }

    emmit('  push rax');
  };

  emmit('.intel_syntax noprefix');
  emmit('.globl main');

  nodes.forEach((node) => {
    gen(node);
  });

  return codes.join('\n');
}
