import {box, fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, ModelPublishMode, uses} from '@xh/hoist/core';
import {FullScreenSupportModel} from '@xh/hoist/desktop/cmp/fullscreenhandler/FullScreenSupportModel';
import {dialog} from '@xh/hoist/kit/blueprint';
import {Children} from 'react';
import {createPortal} from 'react-dom';

export const [FullScreenSupport, fullScreenSupport] = hoistCmp.withFactory({
    model: uses(FullScreenSupportModel, {
        publishMode: ModelPublishMode.LIMITED,
        createDefault: () => new FullScreenSupportModel()
    }),
    displayName: 'FullScreenSupport',
    render({children, model, ...modalProps}) {
        return fragment(
            inlineContainer(),
            modalContainer(modalProps),
            createPortal(Children.only(children), model.hostNode)
        );
    }
});

const inlineContainer = hoistCmp.factory({
    model: uses(FullScreenSupportModel),
    render({model}) {
        return box({
            ref: model.inlineRef,
            width: '100%',
            height: '100%',
            display: 'inherit',
            flexDirection: 'inherit'
        });
    }
});
// TODO - use overlay instead of dialog
// TODO - add a button we can just drop in
// TODO - discuss component name and props (call ModalSupport?)
// TODO - add to DashContainerViews?
const modalContainer = hoistCmp.factory({
    model: uses(FullScreenSupportModel),
    render({model, ...modalProps}) {
        if (!model.isFullScreen) return null;
        return dialog({
            style: {
                width: '90vw',
                height: '90vh'
            },
            isOpen: true,
            canOutsideClickClose: true,
            item: box({
                ref: model.modalRef,
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }),
            onClose: () => model.toggleFullScreen(),
            ...modalProps
        });
    }
});