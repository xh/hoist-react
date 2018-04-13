/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {isPlainObject} from 'lodash';
import {Exception, ExceptionHandler} from 'hoist/exception';

import {hoistModel} from './HoistModel';

/**
 * Top-level provider of key aliases to methods and services in Hoist.
 *
 * These are made available to application via the global XH;
 * They are also available for troubleshooting purposes via window.XH;
 */
export const XH = window.XH = new class {

    // Set via webpack.DefinePlugin at build time - see @xh/hoist-dev-utils/configureWebpack
    appName = xhAppName;
    appVersion = xhAppVersion;
    appBuild = xhAppBuild;
    baseUrl = xhBaseUrl;

    constructor() {
        this.hoistModel = hoistModel;
        this.aliasServices();
        this.aliasMethods();
    }

    get appModel() {
        return this.hoistModel.appModel;
    }

    get routerModel() {
        return this.hoistModel.routerModel;
    }

    navigate(...args) {
        this.routerModel.navigate(...args);
    }


    //--------------------------
    // Implementation
    //--------------------------
    aliasServices() {
        this.createPropAliases(this.hoistModel, [
            'configService',
            'environmentService',
            'errorTrackingService',
            'feedbackService',
            'fetchService',
            'identityService',
            'localStorageService',
            'prefService',
            'trackService'
        ]);
    }

    aliasMethods() {
        this.createMethodAliases(this.trackService,             ['track']);
        this.createMethodAliases(this.fetchService,             ['fetchJson']);
        this.createMethodAliases(this.identityService,          ['getUser']);
        this.createMethodAliases(this.configService,            {getConf: 'get'});
        this.createMethodAliases(this.prefService,              {getPref: 'get', setPref: 'set'});
        this.createMethodAliases(this.environmentService,       {getEnv: 'get'});
        this.createMethodAliases(Exception,                     {exception: 'create'});
        this.createMethodAliases(ExceptionHandler,              ['handleException']);

    }

    createMethodAliases(src, aliases) {
        const bindFn = (tgtName, srcName) => this[tgtName] = src[srcName].bind(src);
        if (isPlainObject(aliases)) {
            for (const name in aliases) {
                bindFn(name, aliases[name]);
            }
        } else {
            aliases.forEach(name => bindFn(name, name));
        }
    }

    createPropAliases(src, aliases) {
        aliases.forEach(it => {
            this[it] = src[it];
        });
    }
}();
