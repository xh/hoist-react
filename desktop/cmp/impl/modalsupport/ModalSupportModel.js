/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {makeObservable, bindable} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';

/**
 * Core Model for a ModalSupport component, responsible for managing `isModal` state and
 * for placing the content `hostNode` in the appropriate container node (either `inline` or `modal`)
 * @private
 */
export class ModalSupportModel extends HoistModel {

    @bindable isModal = false;

    inlineRef = createObservableRef();
    modalRef = createObservableRef();
    hostNode;

    /**
     * @param {PanelModel} panelModel
     */
    constructor(panelModel) {
        super();
        makeObservable(this);
        this.hostNode = this.createHostNode();

        this.panelModel = panelModel;

        const {inlineRef, modalRef, hostNode} = this;
        this.addReaction({
            track: () => [inlineRef.current, modalRef.current, this.isModal],
            run: () => {
                const dest = this.isModal ? modalRef : inlineRef;
                dest.current?.appendChild(hostNode);
            }
        });
    }

    /**
     * @returns {HTMLDivElement} Empty div set to inherit all styling from its parent
     */
    createHostNode() {
        const hostNode = document.createElement('div');
        hostNode.style.all = 'inherit';
        hostNode.classList.add('xh-modal-support__host');
        document.body.appendChild(hostNode);
        return hostNode;
    }

    /**
     * Toggle the current state of `isModal`
     */
    toggleIsModal() {
        this.setIsModal(!this.isModal);
    }

    /**
     * Destroy the `hostNode` DOM Element
     */
    destroy() {
        this.hostNode.remove();
        super.destroy();
    }
}