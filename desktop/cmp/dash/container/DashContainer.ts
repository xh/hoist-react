/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {div, frame, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {
    hoistCmp,
    HoistProps,
    ModelLookupContext,
    refreshContextView,
    TestSupportProps,
    uses
} from '@xh/hoist/core';
import {mask} from '@xh/hoist/cmp/mask';
import {dashContainerView} from '@xh/hoist/desktop/cmp/dash/container/impl/DashContainerView';
import {Classes, overlay} from '@xh/hoist/kit/blueprint';
import {useOnMount, useOnResize} from '@xh/hoist/utils/react';
import {useContext} from 'react';
import './DashContainer.scss';
import {createPortal} from 'react-dom';
import {DashContainerModel} from './DashContainerModel';
import {dashContainerAddViewButton} from './impl/DashContainerContextMenu';

export type DashContainerProps = HoistProps<DashContainerModel> & TestSupportProps;

/**
 * Display a set of child components in accordance with a DashContainerModel.
 */
export const [DashContainer, dashContainer] = hoistCmp.withFactory<DashContainerProps>({
    displayName: 'DashContainer',
    model: uses(DashContainerModel),
    className: 'xh-dash-container',

    render({model, className, testId}, ref) {
        // Store current ModelLookupContext in model, to be applied in views later
        const context = useContext(ModelLookupContext);
        useOnMount(() => (model.modelLookupContext = context));

        // Get enhance container ref with GoldenLayout resize handling
        ref = composeRefs(
            ref,
            model.containerRef,
            useOnResize(() => model.onResize(), {debounce: 100})
        );
        return refreshContextView({
            model: model.refreshContextModel,
            item: frame(
                frame({className, ref, testId}),
                mask({spinner: true, bind: model.loadingStateTask}),
                emptyContainerOverlay(),
                model.viewModels.map(vm =>
                    createPortal(dashContainerView({model: vm}), vm.hostNode, vm.id)
                )
            )
        });
    }
});

const emptyContainerOverlay = hoistCmp.factory<DashContainerModel>(({model}) => {
    const {isEmpty, emptyText, loadingStateTask} = model;
    if (!isEmpty || loadingStateTask.isPending) return null;

    return overlay({
        className: `xh-dash-container--empty-overlay ${Classes.OVERLAY_SCROLL_CONTAINER}`,
        autoFocus: true,
        isOpen: true,
        canEscapeKeyClose: false,
        usePortal: false,
        enforceFocus: false,
        item: vbox({
            alignItems: 'center',
            items: [div(emptyText), vspacer(10), dashContainerAddViewButton()]
        })
    });
});
