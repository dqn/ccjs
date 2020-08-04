import { AstNode } from './parse';

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

export function generateCode(node: AstNode) {
  console.log('.intel_syntax noprefix');
  console.log('.globl main');
  console.log('main:');

  gen(node);

  console.log('  pop rax');
  console.log('  ret');
}
