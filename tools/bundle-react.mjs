// Builds vendor/react.js, vendor/react-dom-client.js and vendor/jsx-runtime.js
// as browser ES modules from the CommonJS production builds of React 19.
// Run once: node tools/bundle-react.mjs [path-to-node_modules]
// (the output is committed, so end users never need to run this)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const nm = process.argv[2] ?? path.join(here, '..', 'node_modules');
const out = path.join(here, '..', 'public', 'vendor');
fs.mkdirSync(out, { recursive: true });

const read = (p) => fs.readFileSync(path.join(nm, p), 'utf8');
const schedulerDir = fs.existsSync(path.join(nm, 'scheduler')) ? 'scheduler' : 'react-dom/node_modules/scheduler';

const modules = {
  react: read('react/cjs/react.production.js'),
  scheduler: read(`${schedulerDir}/cjs/scheduler.production.js`),
  'react-dom': read('react-dom/cjs/react-dom.production.js'),
  'react-dom/client': read('react-dom/cjs/react-dom-client.production.js'),
  'react/jsx-runtime': read('react/cjs/react-jsx-runtime.production.js'),
};

function wrap(name, src) {
  return `__define(${JSON.stringify(name)}, function (module, exports, require) {\n${src}\n});\n`;
}

const runtime = `
const __registry = new Map();
const __cache = new Map();
function __define(name, fn) { __registry.set(name, fn); }
function __require(name) {
  if (__cache.has(name)) return __cache.get(name).exports;
  const fn = __registry.get(name);
  if (!fn) throw new Error('vendor: unknown module ' + name);
  const module = { exports: {} };
  __cache.set(name, module);
  fn(module, module.exports, __require);
  return module.exports;
}
if (typeof process === 'undefined') { globalThis.process = { env: { NODE_ENV: 'production' } }; }
`;

const core = runtime + Object.entries(modules).map(([n, s]) => wrap(n, s)).join('\n');

// react.js — the single shared instance; other entry files import from it.
const reactExports = [
  'Children','Component','Fragment','Profiler','PureComponent','StrictMode','Suspense',
  'cloneElement','createContext','createElement','createRef','forwardRef','isValidElement','lazy','memo',
  'startTransition','use','useActionState','useCallback','useContext','useDebugValue','useDeferredValue',
  'useEffect','useId','useImperativeHandle','useInsertionEffect','useLayoutEffect','useMemo','useOptimistic',
  'useReducer','useRef','useState','useSyncExternalStore','useTransition','version',
];
const reactJs = `${core}
export const __modules = { react: __require('react'), 'react-dom': __require('react-dom'), 'react-dom/client': __require('react-dom/client'), 'react/jsx-runtime': __require('react/jsx-runtime') };
const React = __modules.react;
export default React;
export const { ${reactExports.join(', ')} } = React;
`;
fs.writeFileSync(path.join(out, 'react.js'), reactJs);

fs.writeFileSync(path.join(out, 'react-dom-client.js'), `import { __modules } from './react.js';
const m = __modules['react-dom/client'];
export default m;
export const { createRoot, hydrateRoot } = m;
`);

fs.writeFileSync(path.join(out, 'react-dom.js'), `import { __modules } from './react.js';
const m = __modules['react-dom'];
export default m;
export const { createPortal, flushSync } = m;
`);

fs.writeFileSync(path.join(out, 'jsx-runtime.js'), `import { __modules } from './react.js';
const m = __modules['react/jsx-runtime'];
export const { jsx, jsxs, Fragment } = m;
`);

console.log('vendored React', JSON.parse(read('react/package.json')).version, '->', out);
