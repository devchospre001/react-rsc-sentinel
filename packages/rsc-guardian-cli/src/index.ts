#!/usr/bin/env node

import { Command } from 'commander';
import { analyze } from './analyze';
import { split } from './split';

const program = new Command();

program
  .name('rsc-guardian')
  .description('Analyze and split React Server Components')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze a file for client-only features')
  .argument('<file>', 'File path to analyze')
  .action(async (file: string) => {
    try {
      await analyze(file);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('split')
  .description('Split a component into server and client files')
  .argument('<file>', 'File path to split')
  .option('--apply', 'Apply the changes (write files)')
  .option('--dry-run', 'Show diff without applying changes', true)
  .action(async (file: string, options: { apply?: boolean; dryRun?: boolean }) => {
    try {
      const apply = options.apply || false;
      await split(file, { apply });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();

