/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/desktop/register';
import {box, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {spinner as spinnerCmp} from '@xh/hoist/cmp/spinner';
import {hoistCmp, HoistModel, TaskObserver, useLocalModel} from '@xh/hoist/core';
import {Classes, overlay} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import PT from 'prop-types';
import './Mask.scss';

/**
 * Mask with optional spinner and text.
 *
 * The mask can be explicitly controlled via props or bound to a Task.
 *
 * Note that the Panel component's `mask` prop provides a common and convenient method for masking
 * sections of the UI without needing to manually create or manage this component.
 */
export const [Mask, mask] = hoistCmp.withFactory({
    displayName: 'Mask',
    className: 'xh-mask',

    render({
        isDisplayed,
        message,
        inline = true,
        spinner = false,
        className
    }) {
        const impl = useLocalModel(LocalMaskModel);

        isDisplayed = withDefault(isDisplayed, impl.task?.isPending);
        message = withDefault(message, impl.task?.message);

        if (!isDisplayed) return null;
        return overlay({
            className: classNames(className, Classes.OVERLAY_SCROLL_CONTAINER),
            autoFocus: false,
            isOpen: true,
            canEscapeKeyClose: false,
            usePortal: !inline,
            enforceFocus: !inline,
            item: vbox({
                className: 'xh-mask-body',
                items: [
                    spinner ? spinnerCmp() : null,
                    spinner ? vspacer(10) : null,
                    message ? box({className: 'xh-mask-text', item: message}) : null
                ]
            })
        });
    }
});

Mask.propTypes = {

    /** Task(s) that should be monitored to determine if the mask should be displayed. */
    bind: PT.oneOfType([PT.instanceOf(TaskObserver), PT.arrayOf(PT.instanceOf(TaskObserver))]),

    /** True to display mask. */
    isDisplayed: PT.bool,

    /** Optional text to be displayed. */
    message: PT.oneOfType([PT.string, PT.element]),

    /** True to display a spinning image.  Default false. */
    spinner: PT.bool,

    /** True (default) to contain mask within its parent, false to fill the viewport. */
    inline: PT.bool,

    /** Click handler **/
    onClick: PT.func
};

class LocalMaskModel extends HoistModel {
    task;

    onLinked() {
        const {bind} = this.componentProps;
        if (bind) {
            this.task = bind instanceof TaskObserver ?
                bind :
                this.markManaged(TaskObserver.trackAll({tasks: bind}));
        }
    }
}
