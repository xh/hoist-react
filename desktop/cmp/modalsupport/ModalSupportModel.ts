/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {ModalSupportOptions} from '@xh/hoist/desktop/cmp/modalsupport';
import '@xh/hoist/desktop/register';
import {observable, makeObservable, action} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';

/**
 * Core Model for a ModalSupport component.
 * This model will place its component's child in 1 of 2 managed DOM nodes (either modal or inline)
 */
export class ModalSupportModel extends HoistModel {
    xhImpl = true;

    @observable
    isModal: boolean = false;
    options: ModalSupportOptions;

    inlineRef = createObservableRef<HTMLElement>();
    modalRef = createObservableRef<HTMLElement>();
    hostNode: HTMLElement;

    constructor(opts: Partial<ModalSupportOptions> = new ModalSupportOptions()) {
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
     * @returns Empty div set to inherit all styling from its parent
     */
    createHostNode(): HTMLElement {
        const hostNode = document.createElement('div');
        hostNode.style.all = 'inherit';
        hostNode.classList.add('xh-modal-support__host');
        document.body.appendChild(hostNode);
        return hostNode;
    }

    @action
    setIsModal(v: boolean) {
        this.isModal = v;
    }

    @action
    toggleIsModal() {
        this.isModal = !this.isModal;
    }

    destroy() {
        this.hostNode.remove();
        super.destroy();
    }
}
