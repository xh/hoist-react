module.exports = {
    presets: [
        '@babel/preset-typescript',
        '@babel/preset-react',
        [
            '@babel/preset-env',
            {
                targets: {node: 'current'},
                useBuiltIns: false,
                bugfixes: true,
                // Force class-properties transform — required for legacy decorators (MobX/@bindable)
                include: ['transform-class-properties']
            }
        ]
    ],
    plugins: [
        // Mirror webpack: TypeScript with allowDeclareFields for @declare field support
        ['@babel/plugin-transform-typescript', {allowDeclareFields: true, isTSX: true}],
        // Legacy decorators — must come before class-properties in Babel plugin order
        ['@babel/plugin-proposal-decorators', {version: 'legacy'}]
    ]
};
