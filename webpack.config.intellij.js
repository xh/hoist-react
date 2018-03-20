/**
 * This is a stub webpack config to help IntelliJ resolve our hoist aliases to a locally checked out
 * copy of hoist-react (when developing in "Hoist Inline" mode). This should enable code completion
 * and click-through navigation for imports such as [import {foo} from 'hoist/bar'].
 *
 * Point to this file within: Settings > Languages & Frameworks > JavaScript > Webpack
 *
 * It is not used for any other webpack related tasks or builds.
 */
const path = require('path');

module.exports = {
    resolve: {
        alias: {
            hoist: path.resolve(__dirname)
        }
    }
};