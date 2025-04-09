module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {node: 'current'},
                corejs: {version: 3, proposals: true},
                include: [
                    'transform-class-properties',
                    'transform-nullish-coalescing-operator',
                    'transform-optional-chaining',
                    'transform-private-methods',
                    'transform-private-property-in-object'
                ]
            }
        ],
        '@babel/preset-typescript',
        '@babel/preset-react'
    ],
    plugins: [
        ['@babel/plugin-proposal-decorators', {version: 'legacy'}],
        ['@babel/plugin-transform-typescript', {allowDeclareFields: true, isTSX: true}],
        [
            'module-resolver',
            {
                root: ['./'],
                alias: {
                    '@xh/hoist': './'
                }
            }
        ]
    ]
};
