module.exports = {
    moduleNameMapper: {
        '\\.scss$': 'identity-obj-proxy',
        XHLogo: '<rootDir>/__mocks__/svg.js'
    },
    transformIgnorePatterns: ['node_modules/react-markdown']
};
