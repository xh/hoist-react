/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * Side-effect import that registers the CSS language mode on hoist-react's CodeMirror instance.
 * Consumers opt-in so the mode file (and its cost) is not bundled into every app.
 *
 * Usage:
 * ```
 * import '@xh/hoist/desktop/cmp/input/modes/cssMode';
 * codeInput({mode: 'css', ...});
 * ```
 *
 * Must be imported via `@xh/hoist` so webpack resolves `codemirror` through hoist-react's
 * node_modules - registering on the same CodeMirror instance the codeInput uses.
 */
import 'codemirror/mode/css/css';
