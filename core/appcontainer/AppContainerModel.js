/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {RootRefreshContextModel} from '@xh/hoist/core/refresh';
import {observable, action} from '@xh/hoist/mobx';
import {PendingTaskModel} from '@xh/hoist/utils/async';

import {AboutDialogModel} from './AboutDialogModel';
import {ExceptionDialogModel} from './ExceptionDialogModel';
import {OptionsDialogModel} from './OptionsDialogModel';
import {FeedbackDialogModel} from './FeedbackDialogModel';
import {LoginPanelModel} from './LoginPanelModel';
import {ImpersonationBarModel} from './ImpersonationBarModel';
import {MessageSourceModel} from './MessageSourceModel';
import {ToastSourceModel} from './ToastSourceModel';
import {ThemeModel} from './ThemeModel';

/**
 *  Root object for Framework GUI State.
 */
@HoistModel
export class AppContainerModel {

    //------------
    // Sub-models
    //------------
    @managed aboutDialogModel = new AboutDialogModel();
    @managed exceptionDialogModel = new ExceptionDialogModel();
    @managed optionsDialogModel = new OptionsDialogModel();
    @managed feedbackDialogModel = new FeedbackDialogModel();
    @managed impersonationBarModel = new ImpersonationBarModel();
    @managed loginPanelModel = new LoginPanelModel();
    @managed messageSourceModel = new MessageSourceModel();
    @managed toastSourceModel = new ToastSourceModel();
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
            this.loginPanelModel,
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

    /** Updated App version available, as reported by server. */
    @observable updateVersion = null;

    /** Text to show if initial auth check fails. */
    @observable accessDeniedMessage = null;

    /**
     * Show the update toolbar prompt. Called by EnvironmentService when the server reports that a
     * new (or at least different) version is available and the user should be prompted.
     *
     * @param {string} updateVersion - latest version available on server.
     */
    @action
    showUpdateBar(updateVersion) {
        this.updateVersion = updateVersion;
    }

    /**
     * Show text denying basic access to app.
     *
     * @param {string} msg - text to be shown.
     */
    @action
    showAccessDenied(msg) {
        this.accessDeniedMessage = msg;
    }
}