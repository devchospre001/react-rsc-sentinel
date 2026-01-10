import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/types';

interface AnalysisResult {
  hasUseClient: boolean;
  hooks: string[];
  browserGlobals: string[];
  eventHandlers: string[];
}

const browserGlobals = new Set([
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
  'location',
  'history',
  'alert',
  'confirm',
  'prompt',
]);

function isHook(name: string): boolean {
  return name.startsWith('use') && name.length > 3 && name[3] === name[3].toUpperCase();
}

function isEventHandler(name: string): boolean {
  return name.startsWith('on') && name.length > 2 && name[2] === name[2].toUpperCase();
}

function analyzeAST(ast: TSESTree.Program): AnalysisResult {
  const result: AnalysisResult = {
    hasUseClient: false,
    hooks: [],
    browserGlobals: [],
    eventHandlers: [],
  };

  const hooksSet = new Set<string>();
  const browserGlobalsSet = new Set<string>();
  const eventHandlersSet = new Set<string>();

  // Check for 'use client' directive
  if (ast.body[0]?.type === 'ExpressionStatement') {
    const expr = ast.body[0].expression;
    if (expr.type === 'Literal' && expr.value === 'use client') {
      result.hasUseClient = true;
    }
  }

  function traverse(node: TSESTree.Node): void {
    // Check for hooks in call expressions
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      if (callee.type === 'Identifier' && isHook(callee.name)) {
        hooksSet.add(callee.name);
      } else if (
        callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier' &&
        isHook(callee.property.name)
      ) {
        hooksSet.add(callee.property.name);
      }
    }

    // Check for browser globals
    if (node.type === 'Identifier' && browserGlobals.has(node.name)) {
      browserGlobalsSet.add(node.name);
    }

    // Check for event handlers in JSX
    if (node.type === 'JSXAttribute' && node.name.type === 'JSXIdentifier') {
      const name = node.name.name;
      if (isEventHandler(name)) {
        eventHandlersSet.add(name);
      }
    }

    // Recursively traverse children
    for (const key in node) {
      const value = (node as any)[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item && typeof item === 'object' && item.type) {
              traverse(item);
            }
          });
        } else if (value.type) {
          traverse(value);
        }
      }
    }
  }

  traverse(ast);

  result.hooks = Array.from(hooksSet).sort();
  result.browserGlobals = Array.from(browserGlobalsSet).sort();
  result.eventHandlers = Array.from(eventHandlersSet).sort();

  return result;
}

export async function analyze(filePath: string): Promise<void> {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const ast = parse(content, {
    jsx: true,
    loc: true,
  });

  const result = analyzeAST(ast);

  console.log(`\nAnalysis for: ${filePath}\n`);
  console.log('─'.repeat(50));
  console.log(`'use client' directive: ${result.hasUseClient ? '✓ Present' : '✗ Missing'}`);
  console.log(`\nDetected Hooks (${result.hooks.length}):`);
  
  if (result.hooks.length > 0) {
    result.hooks.forEach((hook) => console.log(`  - ${hook}`));
  } else {
    console.log('  (none)');
  }
  
  console.log(`\nDetected Browser Globals (${result.browserGlobals.length}):`);
  
  if (result.browserGlobals.length > 0) {
    result.browserGlobals.forEach((global) => console.log(`  - ${global}`));
  } else {
    console.log('  (none)');
  }
  
  console.log(`\nDetected Event Handlers (${result.eventHandlers.length}):`);
  
  if (result.eventHandlers.length > 0) {
    result.eventHandlers.forEach((handler) => console.log(`  - ${handler}`));
  } else {
    console.log('  (none)');
  }
  
  console.log('─'.repeat(50));

  if (!result.hasUseClient && (result.hooks.length > 0 || result.browserGlobals.length > 0 || result.eventHandlers.length > 0)) {
    console.log('\n⚠️  This file uses client-only features but is missing "use client" directive.');
    console.log('   Consider running: rsc-guardian split <file> --dry-run\n');
  }
}

