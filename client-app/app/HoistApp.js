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
import {LoginPanel} from './LoginPanel';
import {ImpersonationBar} from './ImpersonationBar';
import {VersionBar} from './VersionBar';

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
            if (!authUsername)  return elem(LoginPanel);
            if (!isInitialized) return this.renderPreloadMask();

            return viewport(
                vframe(
                    elem(ImpersonationBar),
                    frame(elem(C)),
                    elem(VersionBar)
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

