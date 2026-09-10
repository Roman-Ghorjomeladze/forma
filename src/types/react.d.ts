/*
 * Minimal React 19 type declarations for a zero-dependency build.
 * If you later add `@types/react` (e.g. when moving to Vite), delete this file.
 */
declare module 'react' {
  export type Key = string | number;
  export type ReactNode =
    | ReactElement
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined
    | Iterable<ReactNode>;
  export interface ReactElement<P = any> {
    type: any;
    props: P;
    key: Key | null;
  }
  export type FC<P = {}> = (props: P) => ReactNode;
  export type PropsWithChildren<P = {}> = P & { children?: ReactNode };
  export type CSSProperties = { [property: string]: string | number | undefined };
  export type Ref<T> = { current: T | null } | ((instance: T | null) => void) | null;
  export interface RefObject<T> { current: T }
  export interface MutableRefObject<T> { current: T }
  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prev: S) => S);
  export type EffectCallback = () => void | (() => void);
  export type DependencyList = ReadonlyArray<unknown>;
  export type Reducer<S, A> = (prevState: S, action: A) => S;

  export interface SyntheticEvent<T = Element, E = Event> {
    currentTarget: T;
    target: EventTarget & T;
    nativeEvent: E;
    preventDefault(): void;
    stopPropagation(): void;
  }
  export type ChangeEvent<T = Element> = SyntheticEvent<T>;
  export type FormEvent<T = Element> = SyntheticEvent<T>;
  export type MouseEvent<T = Element> = SyntheticEvent<T, globalThis.MouseEvent> & { clientX: number; clientY: number };
  export type PointerEvent<T = Element> = SyntheticEvent<T, globalThis.PointerEvent> & { clientX: number; clientY: number; pointerId: number };
  export type TouchEvent<T = Element> = SyntheticEvent<T, globalThis.TouchEvent> & { touches: TouchList; changedTouches: TouchList };
  export type KeyboardEvent<T = Element> = SyntheticEvent<T, globalThis.KeyboardEvent> & { key: string };

  export interface Context<T> {
    Provider: FC<{ value: T; children?: ReactNode }>;
    Consumer: FC<{ children: (value: T) => ReactNode }>;
  }

  export function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  export function useEffect(effect: EffectCallback, deps?: DependencyList): void;
  export function useLayoutEffect(effect: EffectCallback, deps?: DependencyList): void;
  export function useMemo<T>(factory: () => T, deps: DependencyList): T;
  export function useCallback<T extends (...args: any[]) => any>(cb: T, deps: DependencyList): T;
  export function useRef<T>(initial: T): MutableRefObject<T>;
  export function useRef<T>(initial: T | null): RefObject<T | null>;
  export function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  export function useReducer<S, A>(reducer: Reducer<S, A>, initial: S): [S, Dispatch<A>];
  export function useContext<T>(ctx: Context<T>): T;
  export function useId(): string;
  export function useSyncExternalStore<T>(subscribe: (cb: () => void) => () => void, getSnapshot: () => T): T;
  export function useTransition(): [boolean, (cb: () => void) => void];
  export function useDeferredValue<T>(value: T): T;
  export function createContext<T>(defaultValue: T): Context<T>;
  export function memo<P>(component: FC<P>): FC<P>;
  export function createElement(type: any, props?: any, ...children: ReactNode[]): ReactElement;
  export function isValidElement(value: unknown): value is ReactElement;
  export function startTransition(cb: () => void): void;
  export const Fragment: FC<{ children?: ReactNode; key?: Key }>;
  export const StrictMode: FC<{ children?: ReactNode }>;
  export const Suspense: FC<{ children?: ReactNode; fallback?: ReactNode }>;
  export const version: string;
  export const Children: {
    map<T>(children: ReactNode, fn: (child: ReactNode, index: number) => T): T[];
    toArray(children: ReactNode): ReactNode[];
    count(children: ReactNode): number;
  };

  const React: {
    useState: typeof useState;
    useEffect: typeof useEffect;
    createElement: typeof createElement;
    Fragment: typeof Fragment;
  };
  export default React;
}

declare module 'react-dom/client' {
  import type { ReactNode } from 'react';
  export interface Root { render(node: ReactNode): void; unmount(): void }
  export function createRoot(container: Element | DocumentFragment): Root;
}

declare module 'react-dom' {
  import type { ReactNode, ReactElement } from 'react';
  export function createPortal(children: ReactNode, container: Element): ReactElement;
  export function flushSync(fn: () => void): void;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
  export namespace JSX {
    type Element = import('react').ReactElement;
    interface ElementChildrenAttribute { children: {} }
    interface IntrinsicAttributes { key?: string | number | null }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
