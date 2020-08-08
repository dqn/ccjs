import { AstNode } from './parse';

function argRegisters(i: number): string {
  if (i > 5) {
    throw new Error('up to 6 arguments can be used');
  }

  const registers = ['rdi', 'rsi', 'rdx', 'rcx', 'r8', 'r9'];
  return registers[i];
}

export function generateCode(nodes: AstNode[]) {
  const newLabel = ((): ((str: string) => string) => {
    let labelCount = 0;
    return (str) => str + labelCount++;
  })();

  const genLval = (node: AstNode) => {
    if (node.kind !== 'lvar') {
      console.error('not left value');
      process.exit(1);
    }

    console.log('  mov rax, rbp');
    console.log('  sub rax, %d', node.offset);
    console.log('  push rax');
  };

  const gen = (node: AstNode) => {
    switch (node.kind) {
      case 'num': {
        console.log('  push %d', node.val);
        return;
      }
      case 'lvar': {
        genLval(node);
        console.log('  pop rax');
        console.log('  mov rax, [rax]');
        console.log('  push rax');
        return;
      }
      case 'assign': {
        genLval(node.lhs);
        gen(node.rhs);

        console.log('  pop rdi');
        console.log('  pop rax');
        console.log('  mov [rax], rdi');
        console.log('  push rdi');
        return;
      }
      case 'call': {
        node.args.forEach((arg, i) => {
          gen(arg);
          console.log('  pop rax');
          console.log('  mov %s, rax', argRegisters(i));
        });

        console.log('  call %s', node.label);
        console.log('  push rax');
        return;
      }
      case 'func': {
        // allocate space for 26 variables.
        console.log(node.label + ':');
        console.log('  push rbp');
        console.log('  mov rbp, rsp');
        console.log('  sub rsp, 208');

        node.args.forEach((arg, i) => {
          genLval(arg);
          console.log('  pop rax');
          console.log('  mov [rax], %s', argRegisters(i));
        });

        node.stmts.forEach((stmt) => {
          gen(stmt);
          console.log('  pop rax');
        });

        console.log('  mov rsp, rbp');
        console.log('  pop rbp');
        console.log('  ret');
        return;
      }
      case 'block': {
        node.stmts.forEach((stmt) => {
          gen(stmt);
          console.log('  pop rax');
        });
        return;
      }
      case 'return': {
        gen(node.expr);
        console.log('  pop rax');
        console.log('  mov rsp, rbp');
        console.log('  pop rbp');
        console.log('  ret');
        return;
      }
      case 'if': {
        gen(node.cond);
        console.log('  pop rax');
        console.log('  cmp rax, 0');

        if (node.caseFalse) {
          const lelse = newLabel('.Lelse');
          const lend = newLabel('.Lend');
          console.log('  je %s', lelse);
          gen(node.caseTrue);
          console.log('  jmp %s', lend);
          console.log(lelse + ':');
          gen(node.caseFalse);
          console.log(lend + ':');
        } else {
          const lend = newLabel('.Lend');
          console.log('  je %s', lend);
          gen(node.caseTrue);
          console.log(lend + ':');
        }
        return;
      }
      case 'while': {
        const lbegin = newLabel('Lbegin');
        const lend = newLabel('Lend');
        console.log(lbegin + ':');
        gen(node.cond);
        console.log('  pop rax');
        console.log('  cmp rax, 0');
        console.log('  je %s', lend);
        gen(node.whileTrue);
        console.log('  jmp %s', lbegin);
        console.log(lend + ':');
        return;
      }
      case 'for': {
        const lbegin = newLabel('Lbegin');
        const lend = newLabel('Lend');
        if (node.init) {
          gen(node.init);
        }
        console.log(lbegin + ':');
        if (node.cond) {
          gen(node.cond);
          console.log('  pop rax');
          console.log('  cmp rax, 0');
          console.log('  je %s', lend);
        }
        gen(node.whileTrue);
        if (node.after) {
          gen(node.after);
        }
        console.log('  jmp %s', lbegin);
        console.log(lend + ':');
        return;
      }
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
  };

  console.log('.intel_syntax noprefix');
  console.log('.globl main');

  nodes.forEach((node) => {
    gen(node);
  });
}
