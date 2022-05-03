import {div, fragment} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {
    FullScreenHandlerModel
} from '@xh/hoist/desktop/cmp/fullscreenhandler/FullScreenHandlerModel';
import {dialog} from '@xh/hoist/kit/blueprint';
import PT from 'prop-types';
import React, {Children, cloneElement} from 'react';
import {createPortal} from 'react-dom';

/**
 * Wraps a React component or element factory with a fullScreenHandler, providing the component
 * with a fullScreenHandlerModel prop containing an observable property isFullScreen and a
 * corresponding method toggleFullScreen()
 * @param Cmp {function | React.Component}
 * @param {Object} [dialogProps]- props applied directly to fullscreen Dialog modal component
 * @param {function(isFullScreen)} [onFullScreenChange] - optional callback onFullScreenChange
 * @returns {function | React.Component} - elem factory or wrapped component
 */
export const withFullScreenHandler =
    (Cmp, dialogProps, onFullScreenChange) => Cmp.isElemFactory ? hoistCmp.factory(
        (props) => fullScreenHandler({item: Cmp(props), dialogProps, onFullScreenChange})) :
        (props) =>
            <FullScreenHandler dialogProps={dialogProps} onFullScreenChange={onFullScreenChange}>
                <Cmp {...props}/>
            </FullScreenHandler>;

export const [FullScreenHandler, fullScreenHandler] = hoistCmp.withFactory({
    model: creates(FullScreenHandlerModel),
    displayName: 'FullScreenHandler',
    render({children, model, dialogProps, onFullScreenChange}) {
        model.onFullScreenChange = onFullScreenChange;
        return fragment(
            hostContainer(),
            fullScreenContainer(dialogProps),
            createPortal(
                cloneElement(Children.only(children), {fullScreenHandlerModel: model}),
                model.reusableNode)
        );
    }
});

FullScreenHandler.propTypes = {
    /** Properties applied directly to the fullscreen Dialog modal component */
    dialogProps: PT.object,

    /** Callback to be invoked onFullScreenChange with boolean argument isFullScreen */
    onFullScreenChange: PT.func
};

const hostContainer = hoistCmp.factory(
    ({model}) => div({
        ref: model.containerRefs.host,
        style: {width: '100%', height: '100%', display: 'inherit', flexDirection: 'inherit'}})
);

const fullScreenContainer = hoistCmp.factory(
    ({model, ...dialogProps}) => {
        if (!model.isFullScreen) return null;
        return dialog({
            style: {
                width: '90vw',
                height: '90vh'
            },
            isOpen: true,
            canOutsideClickClose: true,
            item: div({
                ref: model.containerRefs.fullScreen,
                style: {display: 'flex', flexDirection: 'column', height: '100%'}
            }),
            onClose: () => model.toggleFullScreen(),
            ...dialogProps
        });
    }
);