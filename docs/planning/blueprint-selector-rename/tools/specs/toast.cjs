// Toast and its container.
const intents = ['primary', 'success', 'warning', 'danger'];
const toast = {
    'bp6-toast': '.xh-toast',
    '[class*=bp6-intent-]': `:is(${intents.map(i => `.xh-toast--intent-${i}`).join(', ')})`
};
intents.forEach(i => (toast[`bp6-intent-${i}`] = `.xh-toast--intent-${i}`));
const container = {
    'bp6-toast-container': '.xh-toast-container',
    'bp6-toast-container-in-portal': '.xh-toast-container--portal',
    'bp6-toast-container-inline': '.xh-toast-container--anchored'
};
['top', 'bottom', 'left', 'right'].forEach(e => (container[`bp6-toast-container-${e}`] = `.xh-toast-container--${e}`));
module.exports = {
    anchors: {
        'bp6-toast': toast,
        'bp6-toast-message': {'bp6-toast-message': '.xh-toast__message'},
        'bp6-toast-container': container,
        'bp6-toast-container-in-portal': container,
        'bp6-toast-container-inline': container
    },
    contextMap: {
        'bp6-dark': '.xh-dark',
        '[data-bp-color-scheme=dark]': null,
        'bp6-button': '.xh-button',
        'bp6-button-group': '.xh-button-group',
        'bp6-minimal': '.xh-button--minimal',
        // Blueprint markup a Hoist toast never has - its icon is xh-toast__icon.
        'bp6-icon': null,
        'bp6-icon-standard': null,
        'bp6-icon-large': null,
        'bp6-icon-cross': null,
        'bp6-button-text': null,
        'bp6-toast-enter': null,
        'bp6-toast-appear': null,
        'bp6-toast-enter-active': null,
        'bp6-toast-appear-active': null,
        'bp6-toast-leave-active': null,
        'bp6-toast-exit': null,
        'bp6-toast-exit-active': null,
        'bp6-intent-primary': null,
        'bp6-intent-success': null,
        'bp6-intent-warning': null,
        'bp6-intent-danger': null
    },
    skipContext: /^bp6-segmented-control$/
};
