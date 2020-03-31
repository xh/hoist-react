/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {useContext} from 'react';
import {div, frame, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {ModelLookupContext} from '@xh/hoist/core/impl';
import {button} from '@xh/hoist/desktop/cmp/button';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {Icon} from '@xh/hoist/icon';
import {Classes, overlay, popover} from '@xh/hoist/kit/blueprint';
import {useOnMount, useOnResize} from '@xh/hoist/utils/react';
import PT from 'prop-types';
import composeRefs from '@seznam/compose-react-refs';

import './DashContainer.scss';
import {DashContainerModel} from './DashContainerModel';
import {dashContainerContextMenu} from './impl/DashContainerContextMenu';

/**
 * Display a set of child components in accordance with a DashContainerModel.
 *
 * @see DashContainerModel
 */
export const [DashContainer, dashContainer] = hoistCmp.withFactory({
    displayName: 'DashContainer',
    model: uses(DashContainerModel),
    className: 'xh-dash-container',

    render({model, className}) {
        // Store current ModelLookupContext in model, to be applied in views later
        const modelLookupContext = useContext(ModelLookupContext);
        useOnMount(() => model.setModelLookupContext(modelLookupContext));

        // Get enhance container ref with GoldenLayout resize handling
        const ref = composeRefs(
            model.containerRef,
            useOnResize(() => model.onResize(), {debounce: 100})
        );
        return frame(
            frame({className, ref}),
            mask({spinner: true, model: model.loadingStateTask}),
            emptyContainerOverlay()
        );
    }
});

DashContainer.propTypes = {
    model: PT.oneOfType([PT.instanceOf(DashContainerModel), PT.object])
};

const emptyContainerOverlay = hoistCmp.factory(
    ({model}) => {
        const {isEmpty, viewState, emptyText, addViewButtonText} = model;
        if (!isEmpty) return null;

        const stack = viewState[0];
        return overlay({
            className: `xh-dash-container--empty-overlay ${Classes.OVERLAY_SCROLL_CONTAINER}`,
            autoFocus: true,
            isOpen: true,
            canEscapeKeyClose: false,
            usePortal: false,
            enforceFocus: false,
            item: vbox({
                alignItems: 'center',
                items: [
                    div(emptyText),
                    vspacer(10),
                    popover({
                        interactionKind: 'click',
                        item: button({
                            icon: Icon.add(),
                            text: addViewButtonText
                        }),
                        content: dashContainerContextMenu({
                            stack,
                            dashContainerModel: model
                        })
                    })
                ]
            })
        });
    }
);
