/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {hoistModel} from 'hoist/core';

/**
 * Top level model for a HoistApp.
 * Applications should override this class to initialize services and provide shared application state.
 */
export class BaseAppModel {

    constructor() {
        hoistModel.appModel = this;
    }

    /**
     * Call this once when application mounted in order to
     * trigger initial authentication and initialization of application.
     */
    async initAsync() {}

}