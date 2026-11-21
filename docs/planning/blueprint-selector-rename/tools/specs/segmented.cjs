// SegmentedControl. Its options were plain bp6-button elements, so Blueprint's button rules port
// onto xh-segmented-control__option. Fill and compact sit on the outer xh-segmented-control block,
// so the inner elements reach them through an :is(), which keeps the weight of the one class each
// replaces. Blueprint's small size is exactly Hoist's compact, and nothing sets inline.
const option = {
    'bp6-button': '.xh-segmented-control__option',
    'bp6-minimal': ':not(.xh-segmented-control__option--selected)',
    'bp6-disabled': '.xh-segmented-control__option--disabled',
    'bp6-small': ':is(.xh-segmented-control--compact *)',
    // Options never carry these.
    'bp6-active': null,
    'bp6-outlined': null,
    'bp6-large': null,
    'bp6-fill': null,
    'bp6-align-left': null,
    'bp6-align-right': null,
    '[class*=bp6-intent]': null,
    '[class*=bp6-intent-]': null
};
['primary', 'success', 'warning', 'danger'].forEach(i => (option[`bp6-intent-${i}`] = null));
module.exports = {
    anchors: {
        'bp6-button': option,
        'bp6-button-text': {'bp6-button-text': '.xh-segmented-control__option-text'},
        'bp6-segmented-control': {
            'bp6-segmented-control': '.xh-segmented-control__options',
            'bp6-fill': ':is(.xh-segmented-control--fill > *)',
            'bp6-inline': null,
            'bp6-small': null,
            'bp6-large': null
        }
    },
    // Options carry no intent class, so these always matched. A repeated class keeps their weight.
    pseudoMap: {
        ':not([class*=bp6-intent-])': '.xh-segmented-control__option',
        ':not(.bp6-intent-primary)': '.xh-segmented-control__option',
        ':not(.bp6-fixed)': '.xh-segmented-control__option'
    },
    contextMap: {
        'bp6-dark': '.xh-dark',
        '[data-bp-color-scheme=dark]': null,
        'bp6-icon': null,
        'bp6-icon-standard': null,
        'bp6-icon-large': null,
        'bp6-button-spinner': null,
        'bp6-spinner-head': null,
        'bp6-large': null,
        'bp6-small': null,
        'bp6-fill': null
    },
    // Button rules in any other context never reach an option.
    skipContext: /^bp6-(button-group|popover-target|popover-wrapper|input-group|input-action|control-group|toast|dialog-footer-actions|numeric-input|align-left|align-right|navbar|tag-input|alert-footer|form-group|html-select|select|menu.*|card|callout|label|file-input|editable-text|tab.*|overlay.*|portal|minimal|outlined|vertical)$/
};
