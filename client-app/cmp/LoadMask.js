/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {box} from 'hoist/layout';
import {circularProgress, modal} from 'hoist/mui';
import {observer} from 'hoist/mobx';


/**
 * Simple LoadMask.
 *
 * This Mask currently will occupy the entire viewport.
 * Localized masking will be provided by a future option.
 *
 * The mask can be explicitly shown, or reactively bound to a PromiseState.
 */
@observer
export class LoadMask extends Component {

    static defaultProps = {
        isDisplayed: false,
        promiseState: null
    };

    render() {
        const {isDisplayed, promiseState} = this.props;
        return modal({
            open: isDisplayed || promiseState.isPending,
            items: box({
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                items: circularProgress()
            })
        });
    }
}
