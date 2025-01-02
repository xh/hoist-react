/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {box, fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {dialog} from '@xh/hoist/kit/blueprint';
import {Children, ReactPortal} from 'react';
import {createPortal} from 'react-dom';
import './ModalSupport.scss';
import {ModalSupportModel} from './ModalSupportModel';

/**
 * A ModalSupport container provides the ability for its child component to expand into a modal
 * state, without requiring its contents to re-render.  All of the child component's state is
 * preserved when toggling between inline and modal views.
 *
 * State and DOM refs are managed via a ModalSupportModel, which must be provided.
 *
 * Not intended for application use.  Instead, make use of the modal support provided by
 * {@link Panel}
 *
 * @internal
 */
export const modalSupport = hoistCmp.factory({
    displayName: 'ModalSupport',
    model: uses(ModalSupportModel, {fromContext: false, publishMode: 'none'}),
    render({model, children}) {
        return fragment(
            // Simple 'box' cmp, inside which to place the child cmp when `model.isModal = false`
            inlineContainer({model}),

            // Dialog cmp, inside which to place the child cmp when `model.isModal = true`
            modalContainer({model}),

            // Render the child cmp inside the `model.hostNode` div.  This div is then placed
            // inside either the inlineContainer or modalContainer in reaction to the state of
            // `model.isModal`
            createPortal(Children.only(children), model.hostNode) as ReactPortal
        );
    }
});

// Simple 'box' cmp, inside which to place the child cmp when `model.isModal = false`
const inlineContainer = hoistCmp.factory<ModalSupportModel>({
    render({model}) {
        return box({
            className: 'xh-modal-support__inline',
            ref: model.inlineRef,
            height: '100%',
            display: 'inherit',
            flexDirection: 'inherit',

            // If not rendering within a container with flexDirection: row, take up all available
            // width:
            ...(model.inlineRef.current?.parentElement.style.flexDirection !== 'row'
                ? {width: '100%'}
                : {})
        });
    }
});

// Dialog cmp, inside which to place the child cmp when `model.isModal = true`
const modalContainer = hoistCmp.factory<ModalSupportModel>({
    render({model}) {
        const {isModal, width, height, canOutsideClickClose} = model;
        return dialog({
            className: 'xh-modal-support__modal',
            style: {width, height},
            canOutsideClickClose,
            isOpen: isModal,
            onClose: () => model.toggleIsModal(),
            // Creates the dialog's portal immediately and keeps it around, to preserve correct ordering relative to any internal popups.
            lazy: false,
            item: box({
                ref: model.modalRef,
                flexDirection: 'column',
                height: '100%'
            })
        });
    }
});
