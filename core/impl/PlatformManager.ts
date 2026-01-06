/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {XH} from './..';

/**
 * Generic singleton object for registering Mobile and Desktop Components and ensuring that they
 * are never cross-imported within the same client application bundle.
 * @internal
 */
class PlatformManager {
    private mobileAPIRegistered = false;
    private desktopAPIRegistered = false;

    registerDesktop() {
        if (this.mobileAPIRegistered) {
            throw XH.exception(
                `Desktop files imported into mobile app. Please check your imports.`
            );
        }
        this.desktopAPIRegistered = true;
    }

    registerMobile() {
        if (this.desktopAPIRegistered) {
            throw XH.exception(
                `Mobile files imported into desktop app. Please check your imports.`
            );
        }
        this.mobileAPIRegistered = true;
    }
}
export const platformManager = new PlatformManager();
