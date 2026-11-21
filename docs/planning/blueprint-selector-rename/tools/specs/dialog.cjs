// Dialog and its parts. Its overlay, container and backdrop rules move with Overlay.
module.exports = {
    anchors: {
        'bp6-dialog': {'bp6-dialog': '.xh-dialog', 'bp6-dark': null},
        'bp6-dialog-header': {'bp6-dialog-header': '.xh-dialog__header'},
        'bp6-dialog-close-button': {'bp6-dialog-close-button': '.xh-dialog__close-button'},
        'bp6-dialog-body': {'bp6-dialog-body': '.xh-dialog__body'},
        'bp6-dialog-footer': {'bp6-dialog-footer': '.xh-dialog__footer', 'bp6-dialog-footer-fixed': null},
        'bp6-dialog-footer-actions': {'bp6-dialog-footer-actions': '.xh-dialog__footer-actions'},
        'bp6-dialog-container': {'bp6-dialog-container': '.xh-dialog__container'},
        // The dialog title is the only heading Hoist still renders.
        'bp6-heading': {'bp6-heading': '.xh-dialog__title'}
    },
    contextMap: {
        'bp6-dark': '.xh-dark',
        '[data-bp-color-scheme=dark]': null,
        'bp6-button': '.xh-button',
        'bp6-overlay-content': ':is(.xh-dialog__container, .xh-overlay__content)',
        'bp6-overlay-scroll-container': ':is(.xh-dialog__overlay, .xh-overlay--scroll-container)',
        'bp6-overlay-inline': '.xh-overlay--inline',
        // Blueprint markup Hoist never renders in a dialog.
        'bp6-dialog-step-container': null,
        'bp6-multistep-dialog': null,
        'bp6-dialog-header-title': null,
        'bp6-icon': null,
        'bp6-icon-large': null,
        'bp6-icon-standard': null,
        'bp6-running-text': null,
        'bp6-text-muted': null,
        'bp6-tooltip': null,
        'bp6-popover': null,
        'bp6-menu': null,
        'bp6-callout': null,
        'bp6-card': null,
        'bp6-alert': null,
        'bp6-alert-body': null
    },
    // Only the dialog's h2 title is rendered.
    dropSelectors: /(^|[ >])h[13456]\.xh-dialog__title/
};
