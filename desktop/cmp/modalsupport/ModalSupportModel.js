/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {ModalSupportOptions} from '@xh/hoist/desktop/cmp/panel';
import '@xh/hoist/desktop/register';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';

/**
 * Core Model for a ModalSupport component.
 * This model will place its component's child in 1 of 2 managed DOM nodes (either modal or inline)
 * @private
 */
export class ModalSupportModel extends HoistModel {

    @bindable isModal = false;

    inlineRef = createObservableRef();
    modalRef = createObservableRef();
    hostNode;
    options;

    /**
     * @param {ModalSupportOptions|Object} opts
     */
    constructor(opts = new ModalSupportOptions()) {
        super();
        makeObservable(this);
        this.hostNode = this.createHostNode();

        this.options = opts instanceof ModalSupportOptions ? opts : new ModalSupportOptions(opts);

        const {inlineRef, modalRef, hostNode} = this;
        this.addReaction({
            track: () => [inlineRef.current, modalRef.current, this.isModal],
            run: () => {
                const dest = this.isModal ? modalRef : inlineRef;
                dest.current?.appendChild(hostNode);
                window.dispatchEvent(new Event('resize'));
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