/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {hoistCmp, uses} from '@xh/hoist/core';
import {navigator as onsenNavigator} from '@xh/hoist/kit/onsen';
import {NavigatorModel} from './NavigatorModel';

import './Navigator.scss';

/**
 * Top-level Component within an application, responsible for rendering pages and managing
 * transitions between pages.
 */
export const [Navigator, navigator] = hoistCmp.withFactory({
    displayName: 'Navigator',
    model: uses(NavigatorModel),
    className: 'xh-navigator',

    render({model, className}) {
        return onsenNavigator({
            className,
            initialRoute: {init: true},
            animationOptions: {duration: 0.2, delay: 0, timing: 'ease-in'},
            renderPage: (pageModel, navigator) => model.renderPage(pageModel, navigator),
            onPostPush: () => model.onPageChange(),
            onPostPop: () => model.onPageChange()
        });
    }
});

Navigator.propTypes = {
    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(NavigatorModel), PT.object])
};