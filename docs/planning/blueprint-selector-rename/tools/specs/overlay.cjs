// Overlay, as Dialog's overlay and the Overlay component. Both elements carried bp6-overlay, so it
// maps to an :is() of the two, which keeps the weight of the one class it replaces.
const overlay = ':is(.xh-dialog__overlay, .xh-overlay)';
module.exports = {
    anchors: {
        'bp6-overlay': {
            'bp6-overlay': overlay,
            // Every rendered overlay is open - the class only added weight.
            'bp6-overlay-open': overlay,
            'bp6-overlay-inline': '.xh-overlay--inline',
            'bp6-overlay-scroll-container': ':is(.xh-dialog__overlay, .xh-overlay--scroll-container)'
        },
        'bp6-overlay-content': {'bp6-overlay-content': ':is(.xh-dialog__container, .xh-overlay__content)'},
        'bp6-overlay-backdrop': {'bp6-overlay-backdrop': ':is(.xh-dialog__backdrop, .xh-overlay__backdrop)'},
        // On the body, while an overlay is open.
        'bp6-overlay-open': {'bp6-overlay-open': '.xh-overlay-open'}
    },
    pseudoMap: {':not(.bp6-overlay-open)': null},
    contextMap: {
        'bp6-dark': '.xh-dark',
        '[data-bp-color-scheme=dark]': null,
        'bp6-overlay-inline': '.xh-overlay--inline',
        'bp6-overlay-scroll-container': ':is(.xh-dialog__overlay, .xh-overlay--scroll-container)'
    },
    // The popover backdrop's rules moved with Popover.
    skipContext: /^bp6-popover-backdrop$/,
    dropSelectors: /xh-popover/
};
