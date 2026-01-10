import { describe, it, expect, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { rules } from '../index';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.afterAll = afterAll;

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
});

describe('no-client-in-server', () => {
  it('should error when hooks are used without "use client"', () => {
    ruleTester.run('no-client-in-server', rules['no-client-in-server'], {
      valid: [
        {
          code: "'use client';\nimport { useState } from 'react';\nexport default function Component() { const [x] = useState(0); return null; }",
        },
      ],
      invalid: [
        {
          code: "import { useState } from 'react';\nexport default function Component() { const [x] = useState(0); return null; }",
          errors: [
            {
              messageId: 'clientFeatureInServer',
              data: { name: 'useState' },
            },
          ],
        },
      ],
    });
  });

  it('should error when browser globals are used without "use client"', () => {
    ruleTester.run('no-client-in-server', rules['no-client-in-server'], {
      valid: [
        {
          code: "'use client';\nexport default function Component() { const x = window.location; return null; }",
        },
      ],
      invalid: [
        {
          code: "export default function Component() { const x = window.location; return null; }",
          errors: [
            {
              messageId: 'clientFeatureInServer',
              data: { name: 'window' },
            },
          ],
        },
      ],
    });
  });

  it('should error when event handlers are used without "use client"', () => {
    ruleTester.run('no-client-in-server', rules['no-client-in-server'], {
      valid: [
        {
          code: "'use client';\nexport default function Component() { return <button onClick={() => {}}>Click</button>; }",
        },
      ],
      invalid: [
        {
          code: "export default function Component() { return <button onClick={() => {}}>Click</button>; }",
          errors: [
            {
              messageId: 'clientFeatureInServer',
              data: { name: 'onClick' },
            },
          ],
        },
      ],
    });
  });
});

