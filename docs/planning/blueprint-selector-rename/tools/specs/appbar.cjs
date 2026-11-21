// AppBar (Blueprint's navbar) and Toolbar's OverflowList.
module.exports = {
    anchors: {
        'bp6-navbar': {'bp6-navbar': '.xh-appbar', 'bp6-dark': null, 'bp6-fixed-top': null},
        'bp6-navbar-group': {
            'bp6-navbar-group': '.xh-appbar__group',
            'bp6-align-left': '.xh-appbar__group--left',
            'bp6-align-right': '.xh-appbar__group--right'
        },
        'bp6-navbar-divider': {'bp6-navbar-divider': '.xh-appbar-separator'},
        'bp6-navbar-heading': {'bp6-navbar-heading': null},
        'bp6-overflow-list': {'bp6-overflow-list': '.xh-overflow-list'},
        'bp6-overflow-list-spacer': {'bp6-overflow-list-spacer': '.xh-overflow-list__spacer'}
    },
    contextMap: {
        'bp6-dark': '.xh-dark',
        '[data-bp-color-scheme=dark]': null,
        // Hoist puts the alignment classes only on the app bar's groups.
        'bp6-align-left': '.xh-appbar__group--left',
        'bp6-align-right': '.xh-appbar__group--right',
        'bp6-fixed-top': null
    }
};
