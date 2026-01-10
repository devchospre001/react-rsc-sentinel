# React RSC Sentinel

A monorepo containing tools to help maintain proper React Server Component boundaries by detecting illegal client-only feature usage and providing automated splitting capabilities.

## Packages

### `eslint-plugin-rsc-guardian`

An ESLint plugin that detects when client-only features (hooks, browser APIs, event handlers) are used in files that should be React Server Components.

### `rsc-guardian-cli`

A CLI tool that can analyze files for client-only features and automatically split components into separate server and client files.

## Problem Statement

React Server Components (RSC) have strict boundaries:
- **Server Components** cannot use:
  - React hooks (`useState`, `useEffect`, etc.)
  - Browser globals (`window`, `document`, `localStorage`, etc.)
  - Event handlers on JSX elements (`onClick`, `onChange`, etc.)

- **Client Components** must start with `'use client'` directive

Accidentally using client-only features in server components can cause runtime errors. Manually splitting components is tedious and error-prone.

## Installation

```bash
# Install dependencies
yarn install

# Build all packages
yarn build
```

## Usage

### ESLint Plugin

Install the plugin in your project:

```bash
npm install -D eslint-plugin-rsc-guardian
# or
yarn add -D eslint-plugin-rsc-guardian
```

Configure ESLint (`.eslintrc.json` or `.eslintrc.js`):

```json
{
  "plugins": ["rsc-guardian"],
  "rules": {
    "rsc-guardian/no-client-in-server": "error"
  }
}
```

With auto-fix option:

```json
{
  "plugins": ["rsc-guardian"],
  "rules": {
    "rsc-guardian/no-client-in-server": [
      "error",
      {
        "autoFix": true
      }
    ]
  }
}
```

The rule will:
- Report errors when client-only features are detected in files without `'use client'`
- Optionally auto-fix by adding `'use client'` at the top of the file

#### Example

**Before (error):**
```tsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**After auto-fix:**
```tsx
'use client';
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### CLI Tool

Install the CLI tool:

```bash
npm install -D rsc-guardian-cli
# or globally
npm install -g rsc-guardian-cli
```

#### Analyze a File

```bash
npx rsc-guardian analyze path/to/Component.tsx
# or if installed globally
rsc-guardian analyze path/to/Component.tsx
```

Output:
```
Analysis for: path/to/Component.tsx

──────────────────────────────────────────────────
'use client' directive: ✗ Missing

Detected Hooks (2):
  - useEffect
  - useState

Detected Browser Globals (1):
  - window

Detected Event Handlers (1):
  - onClick
──────────────────────────────────────────────────

⚠️  This file uses client-only features but is missing "use client" directive.
   Consider running: rsc-guardian split <file> --dry-run
```

#### Split a Component

Preview the split (dry-run):

```bash
npx rsc-guardian split path/to/Component.tsx --dry-run
# or if installed globally
rsc-guardian split path/to/Component.tsx --dry-run
```

Apply the split:

```bash
npx rsc-guardian split path/to/Component.tsx --apply
# or if installed globally
rsc-guardian split path/to/Component.tsx --apply
```

**Example Input:**
```tsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**Generated Files:**

`Component.server.tsx`:
```tsx
import React from 'react';
import CounterClient from './Component.client';

export default function Counter(props: any) {
  return <CounterClient {...props} />;
}
```

`Component.client.tsx`:
```tsx
'use client';
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## Development

```bash
# Build all packages
yarn build

# Run tests
yarn test

# Lint all packages
yarn lint

# Watch mode for development
yarn dev
```

## Limitations

This tool uses heuristics to detect client-only features and is not a perfect code transformer. Known limitations:

1. **Heuristic-based detection**: The tool identifies patterns (hooks starting with `use`, browser globals by name, event handlers by naming convention) but may have false positives/negatives.

2. **Simple splitting strategy**: The current implementation:
   - Assumes one default export component per file
   - Moves all code with client features to the client component
   - Creates a thin server component wrapper
   - May not handle complex component structures optimally

3. **No dependency analysis**: The tool doesn't analyze whether imported modules are client-only, only direct usage in the file.

4. **Type safety**: Generated code uses `any` types for props. You may need to refine types manually.

5. **Import management**: Complex import scenarios (re-exports, barrel files) may require manual adjustment.

For production use, always review the generated code and test thoroughly.

## Project Structure

```
react-rsc-sentinel/
├── packages/
│   ├── eslint-plugin-rsc-guardian/    # ESLint plugin
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── rules/
│   │   │       └── no-client-in-server.ts
│   │   └── package.json
│   └── rsc-guardian-cli/              # CLI tool
│       ├── src/
│       │   ├── index.ts
│       │   ├── analyze.ts
│       │   └── split.ts
│       ├── __fixtures__/              # Test fixtures
│       └── package.json
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT 

