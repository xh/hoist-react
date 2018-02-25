/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {
    BaseService,
    ConfigService,
    EnvironmentService,
    ExceptionHandlerService,
    ErrorTrackingService,
    FeedbackService,
    FetchService,
    IdentityService,
    LocalStorageService,
    PrefService,
    TrackService,
    EventService
} from 'hoist/svc';


/**
 * Top-level management for Hoist Services.
 *
 * TODO: Provide API for apps to override core services and add additional service.
 */
export class ServiceManager {

    configService = new ConfigService();
    environmentService = new EnvironmentService();
    exceptionHandlerService = new ExceptionHandlerService();
    errorTrackingService = new ErrorTrackingService();
    feedbackService = new FeedbackService();
    fetchService = new FetchService();
    identityService = new IdentityService();
    localStorageService = new LocalStorageService();
    prefService = new PrefService();
    trackService = new TrackService();
    eventService = new EventService();


    async initAsync() {
        const ensureReady = BaseService.ensureSvcsReadyAsync.bind(BaseService);

        await ensureReady(this.fetchService, this.localStorageService);
        await ensureReady(this.configService, this.prefService);
        await ensureReady(
            this.environmentService,
            this.exceptionHandlerService,
            this.errorTrackingService,
            this.feedbackService,
            this.identityService,
            this.trackService,
            this.eventService
        );
    }
}
export const serviceManager = new ServiceManager();