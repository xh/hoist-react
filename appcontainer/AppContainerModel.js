/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed, RootRefreshContextModel} from '@xh/hoist/core';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {Icon} from '@xh/hoist/icon';

import {AboutDialogModel} from './AboutDialogModel';
import {BannerSourceModel} from './BannerSourceModel';
import {ExceptionDialogModel} from './ExceptionDialogModel';
import {FeedbackDialogModel} from './FeedbackDialogModel';
import {ImpersonationBarModel} from './ImpersonationBarModel';
import {MessageSourceModel} from './MessageSourceModel';
import {OptionsDialogModel} from './OptionsDialogModel';
import {ThemeModel} from './ThemeModel';
import {ToastSourceModel} from './ToastSourceModel';

/**
 *  Root object for Framework GUI State.
 */
export class AppContainerModel extends HoistModel {

    //------------
    // Sub-models
    //------------
    @managed aboutDialogModel = new AboutDialogModel();
    @managed exceptionDialogModel = new ExceptionDialogModel();
    @managed optionsDialogModel = new OptionsDialogModel();
    @managed feedbackDialogModel = new FeedbackDialogModel();
    @managed impersonationBarModel = new ImpersonationBarModel();
    @managed messageSourceModel = new MessageSourceModel();
    @managed toastSourceModel = new ToastSourceModel();
    @managed bannerSourceModel = new BannerSourceModel();
    @managed themeModel = new ThemeModel();
    @managed refreshContextModel = new RootRefreshContextModel();

    /**
     * Tracks globally loading promises.
     * Link any async operations that should mask the entire application to this model.
     */
    @managed
    appLoadModel = new PendingTaskModel({mode: 'all'});

    init() {
        const models = [
            this.aboutDialogModel,
            this.exceptionDialogModel,
            this.optionsDialogModel,
            this.feedbackDialogModel,
            this.impersonationBarModel,
            this.messageSourceModel,
            this.toastSourceModel,
            this.themeModel,
            this.appLoadModel,
            this.refreshContextModel
        ];
        models.forEach(it => {
            if (it.init) it.init();
        });
    }

    /**
     * Show the update Banner. Called by EnvironmentService when the server reports that a
     * new (or at least different) version is available and the user should be prompted.
     *
     * @param {string} version - updated version from server.
     * @param {string} [build] - updated build from server - included for snapshot version prompts.
     */
    showUpdateBanner(version, build) {
        // Display build tag for snaps only - not of much interest across actual version updates.
        if (version.includes('SNAPSHOT') && build && build !== 'UNKNOWN') {
            version += ` (b${build})`;
        }

        // Show Banner
        const mobile = XH.isMobileApp,
            message = mobile ? 'Update available!' : `A new version of ${XH.clientAppName} is available!`,
            buttonText = mobile ? version : `Update to ${version}`;

        XH.showBanner({
            category: 'app-update',
            message,
            icon: Icon.rocket({size: 'lg'}),
            intent: 'warning',
            enableClose: false,
            actionFn: () => XH.reloadApp(),
            actionButtonProps: {
                icon: Icon.refresh(),
                text: buttonText
            }
        });
    }
}
