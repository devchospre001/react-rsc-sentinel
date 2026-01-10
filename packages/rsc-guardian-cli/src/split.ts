import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/types';
import { diffLines } from 'diff';

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

interface SplitContext {
  hasClientFeatures: boolean;
  clientNodes: Set<TSESTree.Node>;
  imports: TSESTree.ImportDeclaration[];
  otherStatements: TSESTree.Statement[];
  defaultExport?: TSESTree.ExportDefaultDeclaration;
}

function analyzeNodeForClientFeatures(node: TSESTree.Node, context: SplitContext): boolean {
  let hasClient = false;

  if (node.type === 'CallExpression') {
    const callee = node.callee;
    if (callee.type === 'Identifier' && isHook(callee.name)) {
      hasClient = true;
    } else if (
      callee.type === 'MemberExpression' &&
      callee.property.type === 'Identifier' &&
      isHook(callee.property.name)
    ) {
      hasClient = true;
    }
  }

  if (node.type === 'Identifier' && browserGlobals.has(node.name)) {
    hasClient = true;
  }

  if (node.type === 'JSXAttribute' && node.name.type === 'JSXIdentifier') {
    const name = node.name.name;
    if (isEventHandler(name)) {
      hasClient = true;
    }
  }

  if (hasClient) {
    context.clientNodes.add(node);
  }

  // Recursively check children
  for (const key in node) {
    const value = (node as any)[key];
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item && typeof item === 'object' && item.type) {
            if (analyzeNodeForClientFeatures(item, context)) {
              hasClient = true;
            }
          }
        });
      } else if (value.type) {
        if (analyzeNodeForClientFeatures(value, context)) {
          hasClient = true;
        }
      }
    }
  }

  return hasClient;
}

function generateServerComponent(
  originalContent: string,
  originalPath: string,
  context: SplitContext
): string {
  const baseName = path.basename(originalPath, path.extname(originalPath));
  const ext = path.extname(originalPath);
  const clientComponentName = `${baseName}.client${ext}`;
  const clientImportName = baseName.charAt(0).toUpperCase() + baseName.slice(1) + 'Client';

  let output = '';

  // Add imports (excluding React if we're importing the client component)
  const reactImport = context.imports.find(
    (imp) => imp.source.value === 'react' || imp.source.value === 'react/jsx-runtime'
  );
  const otherImports = context.imports.filter(
    (imp) => imp.source.value !== 'react' && imp.source.value !== 'react/jsx-runtime'
  );

  if (reactImport) {
    const sourceCode = originalContent.slice(reactImport.range[0], reactImport.range[1]);
    output += sourceCode + '\n';
  } else {
    output += "import React from 'react';\n";
  }

  // Add client component import
  output += `import ${clientImportName} from './${clientComponentName}';\n`;

  // Add other imports
  for (const imp of otherImports) {
    const sourceCode = originalContent.slice(imp.range[0], imp.range[1]);
    output += sourceCode + '\n';
  }

  output += '\n';

  // Generate server component
  if (context.defaultExport) {
    const exportNode = context.defaultExport;
    if (exportNode.declaration.type === 'FunctionDeclaration' || exportNode.declaration.type === 'ArrowFunctionExpression') {
      const funcName = exportNode.declaration.type === 'FunctionDeclaration' 
        ? exportNode.declaration.id?.name || 'Component'
        : 'Component';
      
      output += `export default function ${funcName}(props: any) {\n`;
      output += `  return <${clientImportName} {...props} />;\n`;
      output += `}\n`;
    } else {
      // For other export types, create a wrapper
      output += `export default function ${baseName.charAt(0).toUpperCase() + baseName.slice(1)}(props: any) {\n`;
      output += `  return <${clientImportName} {...props} />;\n`;
      output += `}\n`;
    }
  } else {
    output += `export default function ${baseName.charAt(0).toUpperCase() + baseName.slice(1)}(props: any) {\n`;
    output += `  return <${clientImportName} {...props} />;\n`;
    output += `}\n`;
  }

  return output;
}

function generateClientComponent(
  originalContent: string,
  originalPath: string,
  context: SplitContext
): string {
  let output = "'use client';\n\n";

  // Add all imports
  for (const imp of context.imports) {
    const sourceCode = originalContent.slice(imp.range[0], imp.range[1]);
    output += sourceCode + '\n';
  }

  // If no React import, add it
  const hasReactImport = context.imports.some(
    (imp) => imp.source.value === 'react' || imp.source.value === 'react/jsx-runtime'
  );
  if (!hasReactImport) {
    output += "import React from 'react';\n";
  }

  output += '\n';

  // Add other statements (type definitions, etc.)
  for (const stmt of context.otherStatements) {
    const sourceCode = originalContent.slice(stmt.range[0], stmt.range[1]);
    output += sourceCode + '\n';
  }

  // Add the default export component
  if (context.defaultExport) {
    const exportNode = context.defaultExport;
    const sourceCode = originalContent.slice(exportNode.range[0], exportNode.range[1]);
    output += sourceCode + '\n';
  }

  return output;
}

export async function split(filePath: string, options: { apply: boolean }): Promise<void> {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const ast = parse(content, {
    jsx: true,
    loc: true,
    range: true,
  });

  const context: SplitContext = {
    hasClientFeatures: false,
    clientNodes: new Set(),
    imports: [],
    otherStatements: [],
  };

  // Analyze the AST
  for (const statement of ast.body) {
    if (statement.type === 'ImportDeclaration') {
      context.imports.push(statement);
    } else if (statement.type === 'ExportDefaultDeclaration') {
      context.defaultExport = statement;
      if (analyzeNodeForClientFeatures(statement, context)) {
        context.hasClientFeatures = true;
      }
    } else {
      context.otherStatements.push(statement);
      if (analyzeNodeForClientFeatures(statement, context)) {
        context.hasClientFeatures = true;
      }
    }
  }

  if (!context.hasClientFeatures) {
    console.log('No client-only features detected. No split needed.');
    return;
  }

  const dir = path.dirname(absolutePath);
  const baseName = path.basename(absolutePath, path.extname(absolutePath));
  const ext = path.extname(absolutePath);
  const serverPath = path.join(dir, `${baseName}.server${ext}`);
  const clientPath = path.join(dir, `${baseName}.client${ext}`);

  const serverContent = generateServerComponent(content, absolutePath, context);
  const clientContent = generateClientComponent(content, absolutePath, context);

  if (options.apply) {
    fs.writeFileSync(serverPath, serverContent, 'utf-8');
    fs.writeFileSync(clientPath, clientContent, 'utf-8');
    console.log(`✓ Created ${serverPath}`);
    console.log(`✓ Created ${clientPath}`);
  } else {
    // Generate unified diff
    console.log('\n--- Proposed Changes ---\n');
    console.log(`+++ ${serverPath}`);
    const serverDiff = diffLines('', serverContent);
    serverDiff.forEach((part: { added?: boolean; removed?: boolean; value: string }) => {
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      const lines = part.value.split('\n');
      lines.forEach((line: string) => {
        if (line || part.added || part.removed) {
          console.log(`${prefix}${line}`);
        }
      });
    });

    console.log(`\n+++ ${clientPath}`);
    const clientDiff = diffLines('', clientContent);
    clientDiff.forEach((part: { added?: boolean; removed?: boolean; value: string }) => {
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      const lines = part.value.split('\n');
      lines.forEach((line: string) => {
        if (line || part.added || part.removed) {
          console.log(`${prefix}${line}`);
        }
      });
    });

    console.log('\n--- End of diff ---');
    console.log('\nRun with --apply to write these files.\n');
  }
}

