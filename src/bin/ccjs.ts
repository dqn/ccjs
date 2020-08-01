import fs from 'fs';
import meow from 'meow';

import { compile } from '@/ccjs';

const cli = meow(
  `
    Usage
      $ ccjs <path>

    Examples
      $ ccjs main.c
`,
  {
    flags: {
      cmd: {
        type: 'string',
        alias: 'c',
      },
    },
  },
);

if (cli.input.length === 1 && cli.input[0]) {
  const src = fs.readFileSync(cli.input[0]);
  compile(src);
  process.exit(0);
}

if (cli.flags.cmd) {
  compile(cli.flags.cmd);
  process.exit(0);
}

cli.showHelp();
