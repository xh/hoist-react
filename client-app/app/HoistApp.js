/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import '@blueprintjs/core/dist/blueprint.css';

import 'babel-polyfill';
import {Component} from 'react';
import {elem} from 'hoist';
import {loadMask, errorRichAlertDialog} from 'hoist/cmp';
import {hocDisplayName} from 'hoist/utils/ReactUtils';
import {box, viewport, vbox} from 'hoist/layout';
import {useStrict, observer} from 'hoist/mobx';

import {hoistAppStore} from './HoistAppStore';
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
            hoistAppStore.initApp();
        }

        render() {
            const {authUsername, authCompleted, isInitialized} = hoistAppStore;

            if (!authCompleted) return loadMask();
            if (!authUsername) return elem(LoginPanel);
            if (!isInitialized) return loadMask();

            return viewport({
                items: [
                    vbox({
                        flex: 1,
                        items: [
                            elem(ImpersonationBar),
                            box({
                                flex: 1,
                                items: elem(C)
                            }),
                            elem(VersionBar)
                        ]
                    }),
                    errorRichAlertDialog()
                ]
            });
        }


    };

    return observer(ret);
}

