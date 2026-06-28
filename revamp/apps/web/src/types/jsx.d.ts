import type { JSX as ReactJSX } from 'react';

/**
 * React 19 removed the global `JSX` namespace (it now lives at `React.JSX`). The
 * codebase uses `JSX.Element` return annotations throughout; re-expose the global
 * namespace as an alias of `React.JSX` so those keep resolving without touching
 * every component file.
 */
declare global {
  namespace JSX {
    type Element = ReactJSX.Element;
    type ElementClass = ReactJSX.ElementClass;
    type ElementAttributesProperty = ReactJSX.ElementAttributesProperty;
    type ElementChildrenAttribute = ReactJSX.ElementChildrenAttribute;
    type IntrinsicElements = ReactJSX.IntrinsicElements;
    type IntrinsicAttributes = ReactJSX.IntrinsicAttributes;
    type IntrinsicClassAttributes<T> = ReactJSX.IntrinsicClassAttributes<T>;
    type LibraryManagedAttributes<C, P> = ReactJSX.LibraryManagedAttributes<C, P>;
  }
}

export {};
