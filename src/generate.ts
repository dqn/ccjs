import { AstNode } from './parse';

function genLval(node: AstNode) {
  if (node.kind !== 'lvar') {
    console.error('not left value');
    process.exit(1);
  }

  console.log('  mov rax, rbp');
  console.log('  sub rax, %d', node.offset);
  console.log('  push rax');
}

function gen(node: AstNode) {
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
    case 'return': {
      gen(node.lhs);
      console.log('  pop rax');
      console.log('  mov rsp, rbp');
      console.log('  pop rbp');
      console.log('  ret');
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
}

export function generateCode(nodes: AstNode[]) {
  console.log('.intel_syntax noprefix');
  console.log('.globl main');
  console.log('main:');

  // allocate space for 26 variables.
  console.log('  push rbp');
  console.log('  mov rbp, rsp');
  console.log('  sub rsp, 208');

  nodes.forEach((node) => {
    gen(node);

    console.log('  pop rax');
  });

  console.log('  mov rsp, rbp');
  console.log('  pop rbp');
  console.log('  ret');
}
