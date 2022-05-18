/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {box, fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, ModelPublishMode} from '@xh/hoist/core';
import {dialog} from '@xh/hoist/kit/blueprint';
import {Children} from 'react';
import {createPortal} from 'react-dom';
import {ModalSupportModel} from './ModalSupportModel';

export const modalSupport = hoistCmp.factory({
    displayName: 'ModalSupport',
    model: uses(ModalSupportModel, {fromContext: false, publishMode: ModelPublishMode.NONE}),
    render({model, children}) {
        return fragment(
            inlineContainer({model}),
            modalContainer({model}),
            createPortal(Children.only(children), model.hostNode)
        );
    }
});

const inlineContainer = hoistCmp.factory({
    render({model}) {
        return box({
            ref: model.inlineRef,
            height: '100%',
            display: 'inherit',
            flexDirection: 'inherit',

            // If not rendering within a container with flexDirection: row, take up all available
            // width:
            ...(model.inlineRef.current?.parentElement.style.flexDirection !== 'row' ?
                {width: '100%'} : {})
        });
    }
});


const modalContainer = hoistCmp.factory({
    render({model}) {
        if (!model.isModal) return null;
        return dialog({
            style: {
                width: '90vw',
                height: '90vh'
            },
            canOutsideClickClose: true,
            isOpen: true,
            onClose: () => model.toggleIsModal(),
            item: box({
                ref: model.modalRef,
                flexDirection: 'column',
                height: '100%'
            }),
            ...model.panelModel.modalViewProps
        });
    }
});