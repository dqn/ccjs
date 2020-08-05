import { setSrc } from './error';
import { generateCode } from './generate';
import { parse } from './parse';
import { tokenize } from './tokenize';

export function compile(src: Buffer | string) {
  src = src.toString();
  setSrc(src);

  const tokens = tokenize(src);
  const nodes = parse(tokens);
  generateCode(nodes);
}
