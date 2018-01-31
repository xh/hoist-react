/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import './HoistApp.css';

import 'babel-polyfill';
import {Component} from 'react';
import {elem} from 'hoist';
import {loadMask} from 'hoist/cmp';
import {hocDisplayName} from 'hoist/utils/ReactUtils';
import {frame, viewport, vframe} from 'hoist/layout';
import {useStrict, observer} from 'hoist/mobx';

import {hoistAppModel} from './HoistAppModel';
import {loginPanel} from './LoginPanel';
import {impersonationBar} from './ImpersonationBar';
import {versionBar} from './VersionBar';

useStrict(true);

/**
 * Host Component for a Hoist Application
 *
 * Provides initialized Hoist services and basic wrapper components
 * for a hoist application.
 */
export function hoistApp(C) {

    const ret = class extends Component {

        static displayName = hocDisplayName('HoistApp', C);

        componentDidMount() {
            hoistAppModel.initApp();
        }

        render() {
            const {authUsername, authCompleted, isInitialized} = hoistAppModel;

            if (!authCompleted) return this.renderPreloadMask();
            if (!authUsername)  return loginPanel();
            if (!isInitialized) return this.renderPreloadMask();

            return viewport(
                vframe(
                    impersonationBar(),
                    frame(elem(C)),
                    versionBar()
                ),
                loadMask({model: hoistAppModel.appLoadModel})
            );
        }

        renderPreloadMask() {
            return loadMask({isDisplayed: true});
        }
    };

    return observer(ret);
}

