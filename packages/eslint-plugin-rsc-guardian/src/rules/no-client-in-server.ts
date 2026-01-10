import { ESLintUtils, TSESLint } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/types';

type MessageIds = 'clientFeatureInServer';
type Options = readonly [
  {
    autoFix?: boolean;
    suggestSplit?: boolean;
  }
];

type RuleFixer = TSESLint.RuleFixer;

const rule = ESLintUtils.RuleCreator(
  (name: string) => `https://github.com/devchospre001/react-rsc-sentinel/blob/main/packages/eslint-plugin-rsc-guardian/docs/rules/${name}.md`
)({
  name: 'no-client-in-server',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow client-only features in React Server Components',
      recommended: 'recommended',
    },
    messages: {
      clientFeatureInServer:
        "Client-only feature '{{name}}' used in a server component. Add 'use client' or split into a client component.",
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          autoFix: {
            type: 'boolean',
            default: false,
          },
          suggestSplit: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      autoFix: false,
      suggestSplit: false,
    },
  ],
  /* Context type is inferred from RuleCreator */
  create(context: TSESLint.RuleContext<MessageIds, Options>, [options]: Options) {
    const sourceCode = context.getSourceCode();
    const filename = context.getFilename();
    
    // regex to only check {.tsx, .jsx, .ts, .js} files
    if (!/\.(tsx?|jsx?)$/.test(filename)) {
      return {};
    }

    let hasUseClient = false;
    const clientFeatures: Array<{ node: TSESTree.Node; name: string; type: 'hook' | 'browser-global' | 'event-handler' }> = [];

    // some browser globals to detect automatically
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

    // checking for 'use client' directive at the top of the file
    const firstStatement = sourceCode.ast.body[0];
    if (
      firstStatement &&
      firstStatement.type === 'ExpressionStatement' &&
      firstStatement.expression.type === 'Literal' &&
      firstStatement.expression.value === 'use client'
    ) {
      hasUseClient = true;
    }

    // If 'use client' is present -> allow everything
    if (hasUseClient) {
      return {};
    }

    function checkIdentifier(node: TSESTree.Identifier): void {
      if (browserGlobals.has(node.name)) {
        clientFeatures.push({
          node,
          name: node.name,
          type: 'browser-global',
        });
      }
    }

    function checkHookCall(node: TSESTree.CallExpression): void {
      const callee = node.callee;
      
      // Check for hook calls: useState(), useEffect(), etc.??
      if (callee.type === 'Identifier') {
        const name = callee.name;
        if (name.startsWith('use') && name[3] && name[3] === name[3].toUpperCase()) {
          clientFeatures.push({
            node,
            name,
            type: 'hook',
          });
        }
      }
      
      // Check for member expressions: React.useState, etc.
      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        const propName = callee.property.name;
        if (propName.startsWith('use') && propName[3] && propName[3] === propName[3].toUpperCase()) {
          clientFeatures.push({
            node,
            name: propName,
            type: 'hook',
          });
        }
      }
    }

    function checkJSXAttribute(node: TSESTree.JSXAttribute): void {
      if (node.name.type === 'JSXIdentifier') {
        const name = node.name.name;
        // Event handlers: onClick, onChange, etc.?
        if (name.startsWith('on') && name.length > 2 && name[2] === name[2].toUpperCase()) {
          clientFeatures.push({
            node,
            name,
            type: 'event-handler',
          });
        }
      }
    }

    return {
      Identifier(node: TSESTree.Identifier) {
        checkIdentifier(node);
      },
      CallExpression(node: TSESTree.CallExpression) {
        checkHookCall(node);
      },
      JSXAttribute(node: TSESTree.JSXAttribute) {
        checkJSXAttribute(node);
      },
      Program() {
        // Report all issues at the end
        return;
      },
      'Program:exit'() {
        for (const feature of clientFeatures) {
          context.report({
            node: feature.node,
            messageId: 'clientFeatureInServer',
            data: {
              name: feature.name,
            },
            fix: options.autoFix
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (fixer: RuleFixer) => {
                  // Insert 'use client' at the top
                  return fixer.insertTextBefore(sourceCode.ast.body[0], "'use client';\n");
                }
              : undefined,
          });
        }
      },
    };
  },
});

export default rule;

