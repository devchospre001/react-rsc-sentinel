# eslint-plugin-rsc-guardian

ESLint plugin to detect illegal React Server Component usage. Helps maintain proper boundaries between server and client components by flagging client-only features in server components.

## Installation

```bash
npm install -D eslint-plugin-rsc-guardian
# or
yarn add -D eslint-plugin-rsc-guardian
# or
pnpm add -D eslint-plugin-rsc-guardian
```

## Usage

### ESLint Flat Config (ESLint 9+)

```javascript
import rscGuardian from 'eslint-plugin-rsc-guardian';

export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'rsc-guardian': rscGuardian,
    },
    rules: {
      'rsc-guardian/no-client-in-server': ['error', { autoFix: false }],
    },
  },
];
```

### Legacy ESLint Config (.eslintrc.json)

```json
{
  "plugins": ["rsc-guardian"],
  "rules": {
    "rsc-guardian/no-client-in-server": "error"
  }
}
```

### With Auto-Fix

Enable automatic addition of `'use client'` directive:

```javascript
{
  rules: {
    'rsc-guardian/no-client-in-server': [
      'error',
      {
        autoFix: true, // Automatically adds 'use client' when client features are detected
      },
    ],
  },
}
```

## Rules

### `no-client-in-server`

Detects client-only features in files that should be React Server Components.

**Detects:**
- React hooks (`useState`, `useEffect`, `useCallback`, etc., including custom hooks like `useXxx`)
- Browser globals (`window`, `document`, `localStorage`, `sessionStorage`, `navigator`, `location`, `history`, `alert`, `confirm`, `prompt`)
- JSX event handlers (`onClick`, `onChange`, `onSubmit`, etc.)

**Options:**
- `autoFix` (boolean, default: `false`): Automatically add `'use client'` directive at the top of the file when client features are detected.

**Examples:**

❌ **Invalid:**
```tsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

✅ **Valid:**
```tsx
'use client';
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

✅ **Valid (Server Component):**
```tsx
async function fetchData() {
  const res = await fetch('https://api.example.com/data');
  return res.json();
}

export default async function ServerComponent() {
  const data = await fetchData();
  return <div>{JSON.stringify(data)}</div>;
}
```

## Integration with Next.js

### Next.js 13+ App Router

The plugin works seamlessly with Next.js App Router. Server Components are the default, so any file without `'use client'` is treated as a server component.

### Example Next.js Config

```javascript
// eslint.config.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const rscGuardian = require('eslint-plugin-rsc-guardian');

export default [
  ...compat.extends('next/core-web-vitals'),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'rsc-guardian': rscGuardian,
    },
    rules: {
      'rsc-guardian/no-client-in-server': ['error', { autoFix: false }],
    },
  },
];
```

## How It Works

1. **File Detection**: Only checks `.tsx`, `.jsx`, `.ts`, and `.js` files
2. **Directive Check**: Looks for `'use client'` directive at the top of the file
3. **Feature Detection**: Scans the AST for:
   - Hook calls (functions starting with `use` followed by uppercase letter)
   - Browser global references
   - JSX event handler attributes
4. **Reporting**: Reports errors for each detected client-only feature

## Limitations

- **Heuristic-based**: Uses pattern matching, not full dependency analysis
- **No import analysis**: Doesn't check if imported modules are client-only
- **Simple detection**: May have false positives/negatives in edge cases

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/devchospre001/react-rsc-sentinel) for contribution guidelines.

## License

MIT

