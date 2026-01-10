# rsc-guardian-cli

CLI tool to analyze React Server Components and automatically split components into separate server and client files.

## Installation

```bash
npm install -D rsc-guardian-cli
# or globally
npm install -g rsc-guardian-cli
# or
yarn add -D rsc-guardian-cli
# or
pnpm add -D rsc-guardian-cli
```

## Usage

### Analyze a Component

Analyze a file to see what client-only features it uses:

```bash
npx rsc-guardian analyze path/to/Component.tsx
# or if installed globally
rsc-guardian analyze path/to/Component.tsx
```

**Example Output:**
```
Analysis for: app/components/Counter.tsx

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

### Split a Component

Automatically split a component into server and client files.

#### Preview Split (Dry Run)

See what changes would be made without modifying files:

```bash
npx rsc-guardian split path/to/Component.tsx --dry-run
# or
npx rsc-guardian split path/to/Component.tsx
```

#### Apply Split

Actually create the split files:

```bash
npx rsc-guardian split path/to/Component.tsx --apply
```

## Examples

### Example 1: Component with Hooks

**Input:** `Counter.tsx`
```tsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**After Split:**

`Counter.server.tsx`:
```tsx
import React from 'react';
import CounterClient from './Counter.client';

export default function Counter(props: any) {
  return <CounterClient {...props} />;
}
```

`Counter.client.tsx`:
```tsx
'use client';
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Example 2: Component with Browser APIs

**Input:** `StorageComponent.tsx`
```tsx
import React from 'react';

export default function StorageComponent() {
  const saveData = () => {
    localStorage.setItem('key', 'value');
    window.alert('Saved!');
  };

  return <button onClick={saveData}>Save</button>;
}
```

**After Split:**

`StorageComponent.server.tsx`:
```tsx
import React from 'react';
import StorageComponentClient from './StorageComponent.client';

export default function StorageComponent(props: any) {
  return <StorageComponentClient {...props} />;
}
```

`StorageComponent.client.tsx`:
```tsx
'use client';
import React from 'react';

export default function StorageComponent() {
  const saveData = () => {
    localStorage.setItem('key', 'value');
    window.alert('Saved!');
  };

  return <button onClick={saveData}>Save</button>;
}
```

## How It Works

1. **Parsing**: Uses TypeScript AST parser to analyze the file
2. **Detection**: Identifies:
   - React hooks (useState, useEffect, custom hooks)
   - Browser globals (window, document, localStorage, etc.)
   - JSX event handlers (onClick, onChange, etc.)
3. **Splitting**:
   - Creates `.server.tsx` file with a thin wrapper component
   - Creates `.client.tsx` file with `'use client'` and all client code
   - Preserves imports and structure

## Limitations

- **Single default export**: Assumes one default export component per file
- **Simple splitting**: Creates a basic wrapper; may need manual refinement
- **Type safety**: Generated code uses `any` types for props
- **No dependency analysis**: Only checks direct usage, not imported modules
- **Heuristic-based**: Uses pattern matching, not full semantic analysis

## Use Cases

- **Migration**: Converting existing components to RSC architecture
- **Refactoring**: Splitting mixed server/client components
- **Code review**: Analyzing components before merging
- **Education**: Understanding RSC boundaries

## Integration with Next.js

Works seamlessly with Next.js App Router:

```bash
# Analyze all components in app directory
npx rsc-guardian analyze app/**/*.tsx

# Split a problematic component
npx rsc-guardian split app/components/ProblematicComponent.tsx --apply
```

## Tips

1. **Always use `--dry-run` first** to preview changes
2. **Review generated code** - the tool provides a starting point, not a final solution
3. **Update imports** - you may need to update imports in other files
4. **Refine types** - replace `any` types with proper TypeScript types
5. **Test thoroughly** - verify the split components work correctly

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/devchospre001/react-rsc-sentinel) for contribution guidelines.

## License

MIT

