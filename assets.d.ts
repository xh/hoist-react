/**
 * Ambient type declarations for non-code asset imports (images, markdown).
 *
 * These allow TypeScript to understand `import img from './foo.png'` without @ts-ignore.
 * Webpack's asset loaders resolve these imports to string URLs at build time.
 *
 * Note: as ambient declarations, these are visible to downstream apps that resolve into
 * hoist-react's source directory via path mapping. This is intentional — all Hoist apps
 * share the same Webpack build tooling and loader configuration.
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
