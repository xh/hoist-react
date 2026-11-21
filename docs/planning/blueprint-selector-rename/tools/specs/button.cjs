const intents = ['primary', 'success', 'warning', 'danger'];
const active = ':is(.xh-button--active, .xh-popover__target--active)';
// Each mapping keeps the class count of what it replaces, so every rule keeps its specificity. Hoist's
// own `.xh-button.bp6-button` compounds become `.xh-button.xh-button` for the same reason.
const button = {
    'bp6-button': '.xh-button',
    'bp6-active': active,
    'bp6-disabled': '.xh-button--disabled',
    'bp6-minimal': '.xh-button--minimal',
    'bp6-outlined': '.xh-button--outlined',
    // Only grid action buttons carry bp6-small - their rule moves to Actions.scss by hand.
    'bp6-small': null,
    'bp6-align-left': null,
    'bp6-align-right': null,
    '[class*=bp6-intent-]': ':not(.xh-button--intent-none)',
    '[class*=bp6-intent]': ':not(.xh-button--intent-none)'
};
intents.forEach(i => (button[`bp6-intent-${i}`] = `.xh-button--intent-${i}`));
module.exports = {
    anchors: {
        'bp6-button': button,
        'bp6-button-group': {
            'bp6-button-group': '.xh-button-group',
            'bp6-minimal': '.xh-button-group--minimal',
            'bp6-outlined': '.xh-button-group--outlined',
            'bp6-vertical': '.xh-button-group--vertical',
            'bp6-fill': '.xh-button-group--fill'
        },
        'bp6-button-text': {'bp6-button-text': '.xh-button__text'}
    },
    pseudoMap: {
        ':not([class*=bp6-intent-])': '.xh-button--intent-none',
        // Hoist never sets bp6-fixed, so this :not() always matched. A repeated .xh-button keeps its weight.
        ':not(.bp6-fixed)': '.xh-button'
    },
    contextMap: {
        'bp6-dark': '.xh-dark',
        '[data-bp-color-scheme=dark]': null,
        'bp6-popover-target': '.xh-popover__target-wrapper',
        'bp6-popover-wrapper': null,
        'bp6-small': null,
        // Blueprint markup that Hoist never renders around or inside a button.
        'bp6-icon': null,
        'bp6-icon-standard': null,
        'bp6-icon-large': null,
        'bp6-alert-footer': null,
        'bp6-button-spinner': null,
        'bp6-spinner-head': null,
        'bp6-label': null,
        'bp6-large': null,
        'bp6-tag-input': null,
        'bp6-fill': null
    },
    foreignContext: /^bp6-(input-group|input|input-action|control-group|toast|align-left|align-right|dialog-footer-actions|numeric-input|intent-.*)$/,
    skipContext: /^bp6-segmented-control$/,
    // SegmentedControl still renders bp6-button and bp6-button-text, so their rules stay.
    keepOriginals: sel => /\.bp6-button(?!-group)\b/.test(sel)
};
