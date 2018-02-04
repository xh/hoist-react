/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {isPlainObject, camelCase} from 'lodash';
import {Exception} from 'hoist/exception';
import {
    BaseService,
    ConfigService,
    EnvironmentService,
    ExceptionHandlerService,
    ErrorTrackingService,
    FeedbackService,
    FetchService,
    IdentityService,
    PrefService,
    TrackService,
    EventService
} from 'hoist/svc';

//----------------------------------------------------------
// Core services. Will be initialized by XH.initAsync() below.
//----------------------------------------------------------
export let
    configService,
    environmentService,
    exceptionHandlerService,
    errorTrackingService,
    feedbackService,
    fetchService,
    identityService,
    prefService,
    trackService,
    eventService;


/**
 * Top-level Hoist manager.
 *
 * This class initializes and manages key hoist services.
 *
 * It's initAsync() method should be completed before rendering any
 * application components.  See the @hoistApp for more details
 * on its initialization.
 *
 * Applications should typically access it via global import
 * However, it is also available as window.XH for console access.
 */
class _XH {

    constructor() {
        Object.assign(this, {
            appName: 'Scout',
            BASE_URL: '/'
        });
        this.injectServices();
        this.aliasServices();
    }

    async initAsync() {
        const ensureReady = BaseService.ensureSvcsReadyAsync.bind(BaseService);

        await ensureReady(fetchService);
        await ensureReady(configService, prefService);
        await ensureReady(
            environmentService,
            exceptionHandlerService,
            errorTrackingService,
            feedbackService,
            identityService,
            trackService,
            eventService
        );
    }

    //------------------------
    // Implementation
    //------------------------
    injectServices(overrides = {}) {
        const inject = (svc) => {
            const nm = camelCase(svc);
            return this[nm] = overrides[nm] || new svc();
        };

        configService = inject(ConfigService);
        environmentService = inject(EnvironmentService);
        exceptionHandlerService = inject(ExceptionHandlerService);
        errorTrackingService = inject(ErrorTrackingService);
        feedbackService = inject(FeedbackService);
        fetchService = inject(FetchService);
        identityService = inject(IdentityService);
        prefService = inject(PrefService);
        trackService = inject(TrackService);
        eventService = inject(EventService);
    }

    aliasServices() {
        this.createAliases(trackService,               ['track']);
        this.createAliases(fetchService,               ['fetchJson']);
        this.createAliases(exceptionHandlerService,    ['handleException']);
        this.createAliases(configService,              {getConf: 'get'});
        this.createAliases(prefService,                {getPref: 'get'});

        this.createAliases(Exception,                  {exception: 'create'});
    }

    createAliases(src, aliases) {
        const bindFn = (tgtName, srcName) => this[tgtName] = src[srcName].bind(src);
        if (isPlainObject(aliases)) {
            for (const name in aliases) {
                bindFn(name, aliases[name]);
            }
        } else {
            aliases.forEach(name => bindFn(name, name));
        }
    }
}
export const XH = window.XH = new _XH();