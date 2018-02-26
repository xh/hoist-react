/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {isPlainObject} from 'lodash';
import {Exception} from 'hoist/exception';
import {hoistModel} from './HoistModel';

/**
 * Top-level provider of key aliases to methods and services in Hoist.
 *
 * These are made available to application via the global XH;
 * They are also available for troubleshooting purposes via window.XH;
 */
export const XH = window.XH = new class {

    // TODO:  Move these
    BASE_URL = '/';
    appName = 'Scout';

    constructor() {
        this.hoistModel = hoistModel;
        this.aliasServices();
        this.aliasMethods();
    }

    //--------------------------
    // Implementation
    //--------------------------
    aliasServices() {
        this.createPropAliases(this.hoistModel, [
            'configService',
            'environmentService',
            'exceptionHandlerService',
            'errorTrackingService',
            'feedbackService',
            'fetchService',
            'identityService',
            'localStorageService',
            'prefService',
            'trackService',
            'eventService'
        ]);
    }

    aliasMethods() {
        this.createMethodAliases(this.trackService,             ['track']);
        this.createMethodAliases(this.fetchService,             ['fetchJson']);
        this.createMethodAliases(this.exceptionHandlerService,  ['handleException']);
        this.createMethodAliases(this.configService,            {getConf: 'get'});
        this.createMethodAliases(this.prefService,              {getPref: 'get'});
        this.createMethodAliases(this.environmentService,       {getEnv: 'get'});
        this.createMethodAliases(Exception,                     {exception: 'create'});
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
