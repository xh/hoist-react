/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import './HoistApp.scss';

import {Component} from 'react';
import {hoistComponent, hoistModel, elem} from 'hoist/core';
import {loadMask} from 'hoist/cmp';
import {contextMenu} from 'hoist/cmp';
import {errorDialog} from 'hoist/error';
import {frame, viewport, vframe} from 'hoist/layout';
import {hocDisplayName} from 'hoist/utils/ReactUtils';
import {Icon} from 'hoist/icon';

import {loginPanel} from './impl/LoginPanel';
import {impersonationBar} from './impl/ImpersonationBar';
import {versionBar} from './impl/VersionBar';
import {aboutDialog} from './impl/AboutDialog';

/**
 * Host Component for a Hoist Application
 *
 * Provides initialized Hoist services and basic wrapper components
 * for a hoist application.
 */
export function hoistApp(C) {
    
    C = hoistComponent()(C);

    const ret = class extends Component {
        static displayName = hocDisplayName('HoistApp', C);

        constructor() {
            // TODO:  Provide to app via Provider/inject mechanism rather than global import.
            super();
            hoistModel.initAsync();
        }

        render() {
            const {authUsername, authCompleted, isInitialized, appLoadModel, errorDialogModel, showAbout} = hoistModel;

            if (!authCompleted) return this.renderPreloadMask();
            if (!authUsername)  return loginPanel();
            if (!isInitialized) return this.renderPreloadMask();

            return viewport(
                vframe(
                    impersonationBar(),
                    frame(elem(C)),
                    versionBar()
                ),
                loadMask({model: appLoadModel, inline: false}),
                errorDialog({model: errorDialogModel}),
                aboutDialog({isOpen: showAbout})
            );
        }

        renderPreloadMask() {
            return loadMask({isDisplayed: true});
        }

        renderContextMenu() {
            return contextMenu({
                menuItems: [
                    {
                        text: 'Reload App',
                        icon: Icon.refresh(),
                        action: () => hoistModel.reloadApp()
                    },
                    {
                        text: 'About',
                        icon: Icon.info(),
                        action: () => hoistModel.setShowAbout(true)
                    }
                ]
            });
        }
    };
    return hoistComponent()(ret);
}

