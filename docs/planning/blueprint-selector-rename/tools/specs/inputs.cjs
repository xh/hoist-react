// InputGroup and its input, TextArea, NumericInput, ControlGroup, RadioInput's group and the
// checkbox, switch and radio Control.
const blank = ['bp6-large', 'bp6-small', 'bp6-fill', 'bp6-intent-primary', 'bp6-intent-success',
    'bp6-intent-warning', 'bp6-intent-danger', '[class*=bp6-intent-]', '[class*=bp6-intent]'];
const without = map => (blank.forEach(c => c in map || (map[c] = null)), map);
const input = without({
    // TextArea's textarea also carried bp6-input. An :is() of the two keeps the one class's weight.
    'bp6-input': ':is(.xh-input-group__input, .xh-text-area)',
    'bp6-text-area': '.xh-text-area',
    'bp6-input-ghost': null,
    'bp6-active': null,
    'bp6-disabled': null,
    'bp6-round': null,
    'bp6-multiline': null,
    'bp6-auto-resize': null,
    'bp6-tag-input': null
});
const control = without({
    'bp6-control': '.xh-control',
    'bp6-checkbox': '.xh-control--checkbox',
    'bp6-switch': '.xh-control--switch',
    'bp6-radio': '.xh-control--radio',
    'bp6-disabled': '.xh-control--disabled',
    'bp6-inline': '.xh-control--inline',
    'bp6-align-left': '.xh-control--align-left',
    'bp6-align-right': '.xh-control--align-right'
});
module.exports = {
    anchors: {
        'bp6-input-group': without({
            'bp6-input-group': '.xh-input-group',
            'bp6-disabled': '.xh-input-group--disabled',
            'bp6-read-only': '.xh-input-group--read-only',
            'bp6-round': '.xh-input-group--round'
        }),
        'bp6-input': input,
        'bp6-text-area': input,
        'bp6-input-left-container': {'bp6-input-left-container': '.xh-input-group__left-element'},
        'bp6-input-action': {'bp6-input-action': '.xh-input-group__right-element'},
        'bp6-control': control,
        'bp6-checkbox': control,
        'bp6-switch': control,
        'bp6-radio': control,
        'bp6-control-indicator': {'bp6-control-indicator': '.xh-control__indicator', 'bp6-control-indicator-child': null},
        'bp6-control-indicator-child': {'bp6-control-indicator-child': null},
        'bp6-control-input': {'bp6-control-input': '.xh-control__input'},
        'bp6-control-group': without({'bp6-control-group': '.xh-control-group', 'bp6-vertical': null}),
        'bp6-numeric-input': without({'bp6-numeric-input': '.xh-numeric-input'}),
        'bp6-radio-group': {'bp6-radio-group': '.xh-radio-input'}
    },
    contextMap: {
        'bp6-dark': '.xh-dark',
        '[data-bp-color-scheme=dark]': null,
        'bp6-button': '.xh-button',
        'bp6-button-group': '.xh-button-group',
        'bp6-vertical': '.xh-button-group--vertical',
        'bp6-minimal': '.xh-button--minimal',
        'bp6-popover-target': '.xh-popover__target-wrapper',
        'bp6-popover-wrapper': null,
        'bp6-icon': null,
        'bp6-icon-standard': null,
        'bp6-icon-large': null,
        'bp6-spinner': null,
        'bp6-tag-input': null,
        'bp6-tag': null,
        'bp6-select': null,
        'bp6-html-select': null,
        'bp6-file-input': null,
        'bp6-form-group': null,
        'bp6-form-content': null,
        'bp6-label': null,
        'bp6-text-muted': null,
        'bp6-large': null,
        'bp6-small': null,
        'bp6-fill': null,
        'bp6-disabled': null,
        'bp6-active': null,
        'bp6-intent-primary': null,
        'bp6-intent-success': null,
        'bp6-intent-warning': null,
        'bp6-intent-danger': null,
        '[class*=bp6-intent-]': null,
        'bp6-navbar': null,
        'bp6-menu': null,
        'bp6-menu-item': null,
        'bp6-card': null,
        'bp6-callout': null,
        'bp6-running-text': null,
        'bp6-tree-node-content': null,
        'bp6-editable-text': null,
        'bp6-control-card': null,
        'bp6-card-list': null,
        'bp6-compact': null,
        'bp6-switch-inner-text': null,
        'bp6-breadcrumb-current': null,
        // The focus style toggle sets both classes on the root. Blueprint's ignore class, inside a
        // :not(), stays until the focus toggle step.
        'bp6-focus-disabled': '.xh-focus-disabled'
    },
    skipContext: /^bp6-(segmented-control|slider.*|tab.*)$/,
    // Blueprint mutes an empty input's own color, which only greys the caret. Hoist never had it.
    // The bundler turns the legacy :-ms-input-placeholder into :placeholder-shown, so drop the
    // vendor placeholder variants too - ::placeholder covers every current browser.
    dropSelectors: /:placeholder-shown|:-ms-input-placeholder|::-moz-placeholder/
};
