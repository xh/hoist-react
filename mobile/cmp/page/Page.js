/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {page as onsenPage} from '@xh/hoist/kit/onsen';
import {panel, Panel} from '@xh/hoist/mobile/cmp/panel';
import {castArray} from 'lodash';

import './Page.scss';

/**
 * Wraps a Panel in an Onsen Page, suitable for inclusion in the navigator.
 */
@HoistComponent
export class Page extends Component {

    static propTypes = {
        ...Panel.propTypes
    };

    render() {
        const {
            children,
            ...rest
        } = this.props;

        return onsenPage({
            className: 'xh-page',
            item: panel({
                items: castArray(children),
                ...rest
            })
        });
    }
}

export const page = elemFactory(Page);