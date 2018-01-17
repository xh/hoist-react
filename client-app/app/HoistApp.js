/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import '@blueprintjs/core/dist/blueprint.css';

import {Component} from 'react';
import {XH, elem} from 'hoist';
import {loadMask} from 'hoist/cmp';
import {box, vbox} from 'hoist/layout';
import {useStrict, observable, action} from 'mobx';
import {observer} from 'mobx-react';

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

        @observable isLoaded = false;

        @action
        markReady = () => {
            this.isLoaded = true;
        }

        componentDidMount() {
            XH.initAsync()
                .then(this.markReady)
                .catchDefault();
        }

        render() {
            if (!this.isLoaded) return loadMask();

            return vbox({
                style: {
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    position: 'fixed'
                },
                items: [
                    elem(ImpersonationBar),
                    box({
                        flex: 1,
                        items: elem(C)
                    }),
                    elem(VersionBar)
                ]
            });
        }
    };

    return observer(ret);
}

