/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, RootRefreshContextModel, TaskObserver, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';
import {AboutDialogModel} from './AboutDialogModel';
import {BannerSourceModel} from './BannerSourceModel';
import {ChangelogDialogModel} from './ChangelogDialogModel';
import {ExceptionDialogModel} from './ExceptionDialogModel';
import {FeedbackDialogModel} from './FeedbackDialogModel';
import {ImpersonationBarModel} from './ImpersonationBarModel';
import {MessageSourceModel} from './MessageSourceModel';
import {OptionsDialogModel} from './OptionsDialogModel';
import {SizingModeModel} from './SizingModeModel';
import {ViewportSizeModel} from './ViewportSizeModel';
import {ThemeModel} from './ThemeModel';
import {ToastSourceModel} from './ToastSourceModel';
import {BannerModel} from './BannerModel';

/**
 * Root object for Framework GUI State.
 */
export class AppContainerModel extends HoistModel {
    //------------
    // Sub-models
    //------------
    /** Link any async operations that should mask the entire application to this model. */
    @managed appLoadModel = TaskObserver.trackAll();

    @managed aboutDialogModel = new AboutDialogModel();
    @managed changelogDialogModel = new ChangelogDialogModel();
    @managed exceptionDialogModel = new ExceptionDialogModel();
    @managed feedbackDialogModel = new FeedbackDialogModel();
    @managed impersonationBarModel = new ImpersonationBarModel();
    @managed optionsDialogModel = new OptionsDialogModel();

    @managed bannerSourceModel = new BannerSourceModel();
    @managed messageSourceModel = new MessageSourceModel();
    @managed toastSourceModel = new ToastSourceModel();

    @managed refreshContextModel = new RootRefreshContextModel();
    @managed sizingModeModel = new SizingModeModel();
    @managed viewportSizeModel = new ViewportSizeModel();
    @managed themeModel = new ThemeModel();

    init() {
        const models = [
            this.appLoadModel,
            this.aboutDialogModel,
            this.changelogDialogModel,
            this.exceptionDialogModel,
            this.feedbackDialogModel,
            this.impersonationBarModel,
            this.optionsDialogModel,
            this.bannerSourceModel,
            this.messageSourceModel,
            this.toastSourceModel,
            this.refreshContextModel,
            this.sizingModeModel,
            this.viewportSizeModel,
            this.themeModel
        ];
        models.forEach((m: any) => m.init?.());
    }

    /**
     * Show the update Banner. Called by EnvironmentService when the server reports that a
     * new (or at least different) version is available and the user should be prompted.
     *
     * @param version - updated version from server.
     * @param build - updated build from server - included for snapshot version prompts.
     */
    showUpdateBanner(version: string, build?: string) {
        // Display build tag for snaps only - not of much interest across actual version updates.
        if (version.includes('SNAPSHOT') && build && build !== 'UNKNOWN') {
            version += ` (b${build})`;
        }

        // Show Banner
        const mobile = XH.isMobileApp,
            message = mobile
                ? 'Update available!'
                : `A new version of ${XH.clientAppName} is available!`,
            buttonText = mobile ? version : `Update to ${version}`;

        XH.showBanner({
            category: 'xhAppUpdate',
            message,
            icon: Icon.rocket({size: 'lg'}),
            intent: 'warning',
            sortOrder: BannerModel.BANNER_SORTS.APP_UPDATE,
            enableClose: false,
            actionButtonProps: {
                icon: Icon.refresh(),
                text: buttonText,
                onClick: () => XH.reloadApp()
            }
        });
    }

    hasAboutDialog() {
        return !isEmpty(this.aboutDialogModel.getItems());
    }
}
