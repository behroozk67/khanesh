# Khanesh — frontend

React 19 + Vite frontend for Khanesh/LabMate. See the [repo root README](../README.md) and
[CLAUDE.md](../CLAUDE.md) for the project overview, architecture, and commands.

```bash
npm install
npm run dev       # Vite dev server; proxies /api/* to http://localhost:8787
npm run build
npm run lint       # oxlint
npm run preview
```

No test runner is configured for this project — trace UI logic by reading the code, per
[.claude/rules/frontend.md](../.claude/rules/frontend.md).

---

Bootstrapped from the Vite React template. Two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
