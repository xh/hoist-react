// Popover, its arrow, target and backdrop, and Tooltip. The tooltip is a popover with xh-tooltip on
// the same element, so both anchors share one map.
const intents = ['primary', 'success', 'warning', 'danger'];
const sides = ['top', 'bottom', 'left', 'right'];
const panel = {
    'bp6-popover': '.xh-popover__content-wrapper',
    'bp6-tooltip': '.xh-tooltip',
    'bp6-minimal': '.xh-popover__content-wrapper--minimal',
    'bp6-compact': '.xh-tooltip--compact',
    'bp6-popover-match-target-width': '.xh-popover__content-wrapper--match-target-width',
    // A menu's submenu popover - its rules moved with the menu.
    'bp6-submenu': null,
    // Hoist never puts these on the popover element itself.
    'bp6-dark': null,
    'bp6-popover-content-sizing': null,
    'bp6-context-menu-popover': null,
    'bp6-multistep-dialog-nav-top': null,
    '[class*=bp6-intent-]': `:is(${intents.map(i => `.xh-tooltip--intent-${i}`).join(', ')})`
};
intents.forEach(i => (panel[`bp6-intent-${i}`] = `.xh-tooltip--intent-${i}`));
sides.forEach(s => (panel[`bp6-popover-placement-${s}`] = `.xh-popover__content-wrapper--${s}`));
module.exports = {
    anchors: {
        'bp6-popover': panel,
        'bp6-tooltip': panel,
        'bp6-popover-content': {'bp6-popover-content': '.xh-popover__content'},
        'bp6-popover-arrow': {'bp6-popover-arrow': '.xh-popover__arrow'},
        'bp6-popover-arrow-border': {'bp6-popover-arrow-border': '.xh-popover__arrow-border'},
        'bp6-popover-arrow-fill': {'bp6-popover-arrow-fill': '.xh-popover__arrow-fill'},
        'bp6-popover-transition-container': {
            'bp6-popover-transition-container': '.xh-popover__floating',
            // Transition classes Hoist never sets.
            'bp6-popover-enter': null,
            'bp6-popover-enter-active': null,
            'bp6-popover-appear': null,
            'bp6-popover-appear-active': null,
            'bp6-popover-exit': null,
            'bp6-popover-exit-active': null
        },
        'bp6-popover-target': {
            'bp6-popover-target': '.xh-popover__target-wrapper',
            'bp6-popover-open': '.xh-popover__target-wrapper--open',
            'bp6-fill': null
        },
        // A popover's backdrop also took Blueprint's generic overlay backdrop rules, which Dialog
        // and Overlay still use. The repeated class keeps the weight of the pair it replaces.
        'bp6-popover-backdrop': {
            'bp6-popover-backdrop': '.xh-popover__content-overlay',
            'bp6-overlay-backdrop': '.xh-popover__content-overlay'
        },
        'bp6-overlay-backdrop': {'bp6-overlay-backdrop': '.xh-popover__content-overlay'}
    },
    // Hoist's arrow is an SVG that floating-ui sizes and places, and an SVG renders no ::before.
    // Blueprint's rules on the arrow element itself only nudge it out of place - keep the fills.
    dropSelectors: /\.xh-popover__arrow(::before)?$/,
    keepOriginals: sel => /\.bp6-overlay-backdrop\b/.test(sel) && !/bp6-popover-backdrop/.test(sel),
    contextMap: {
        'bp6-dark': '.xh-dark',
        '[data-bp-color-scheme=dark]': null,
        'bp6-popover-wrapper': null,
        // Dialog and Overlay markup, never around a popover backdrop.
        'bp6-overlay': null,
        'bp6-overlay-inline': null,
        'bp6-overlay-open': null,
        'bp6-overlay-scroll-container': null,
        'bp6-overlay-content': null,
        'bp6-overlay-start-focus-trap': null,
        'bp6-overlay-end-focus-trap': null,
        'bp6-large': null,
        'bp6-small': null
    },
    // Buttons and menu items in a popover target were ported with Button and Menu.
    skipContext: /^bp6-(button|button-group|button-text|menu|menu-item|submenu)$/,
    // Rules that style another component inside a popover stay in place until that component moves.
    foreignContext: /^bp6-(input|input-group|control-group|heading|text-muted|key|code|dialog.*|toast.*|tag.*|select|html-select|navbar|tab.*|slider.*|numeric-input|segmented-control|icon.*|card|callout|label|form-group|control|switch|checkbox|radio|align-.*|fill|vertical|minimal|outlined|disabled|active|intent-.*)$/
};
