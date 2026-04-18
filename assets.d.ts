/**
 * Ambient type declarations for non-code asset imports (images, markdown).
 *
 * These allow TypeScript to understand `import img from './foo.png'` without `@ts-ignore`.
 * Webpack's asset loaders resolve these imports to string URLs at build time.
 *
 * Downstream apps compile hoist-react source via the `@xh/hoist/*` path mapping, but their
 * tsconfig `include` patterns typically do not reach this file. Any hoist-react source file
 * that imports an asset must therefore pull these declarations in explicitly with a
 * triple-slash reference, e.g.:
 *
 *     /// <reference path="../../assets.d.ts" />
 *     import spinnerImg from './spinner-50px.png';
 */
declare module '*.png' {
    const src: string;
    export default src;
}

declare module '*.gif' {
    const src: string;
    export default src;
}

declare module '*.jpg' {
    const src: string;
    export default src;
}

declare module '*.svg' {
    const src: string;
    export default src;
}

declare module '*.md' {
    const content: string;
    export default content;
}
