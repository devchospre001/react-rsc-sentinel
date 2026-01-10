# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-01-10

### Added
- Initial release of `eslint-plugin-rsc-guardian`
  - ESLint rule `no-client-in-server` to detect illegal React Server Component usage
  - Detects React hooks (useState, useEffect, custom hooks)
  - Detects browser globals (window, document, localStorage, etc.)
  - Detects JSX event handlers (onClick, onChange, etc.)
  - Auto-fix option to add 'use client' directive

- Initial release of `rsc-guardian-cli`
  - `analyze` command to detect client-only features in components
  - `split` command to automatically split components into server and client files
  - Support for dry-run mode to preview changes
  - Unified diff output for reviewing splits

### Features
- TypeScript support
- Comprehensive test coverage
- ESLint flat config support
- Next.js App Router compatibility

[Unreleased]: https://github.com/devchospre001/react-rsc-sentinel/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/devchospre001/react-rsc-sentinel/releases/tag/v1.0.0

