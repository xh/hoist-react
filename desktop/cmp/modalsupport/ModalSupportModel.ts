/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {bindable} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';

/**
 * Configuration for a {@link ModalSupportModel}. Passed via the `modalSupport` config on
 * {@link PanelConfig} - set to `true` for defaults or provide a config object to customize
 * the dialog dimensions and behavior.
 *
 * @see ModalSupportModel
 * @see PanelModel
 */
export interface ModalSupportConfig {
    /** Width of the modal dialog. Default `'90vw'`. */
    width?: string | number;

    /** Height of the modal dialog. Default `'90vh'`. */
    height?: string | number;

    /** True to start in modal (popped-out) state. Default `false`. */
    defaultModal?: boolean;

    /** True to allow closing the modal by clicking outside it. Default `true`. */
    canOutsideClickClose?: boolean;
}

/**
 * Model enabling a {@link Panel}'s content to toggle between inline and modal (floating
 * dialog) display while preserving all component state.
 *
 * Uses a React portal to move a single persistent DOM host node between an inline container
 * and a Blueprint Dialog. Because the child component is rendered into the host node once
 * and the node is physically relocated (not re-mounted), all React component state, MobX
 * subscriptions, and DOM state (scroll position, focus, ag-Grid state, etc.) are preserved
 * across toggles.
 *
 * This is the key advantage over the alternative of mounting a second copy of a component
 * inside a separate dialog - ModalSupport guarantees zero state loss on toggle.
 *
 * Not created directly by applications - enable via `modalSupport` on {@link PanelConfig}.
 *
 * @see ModalSupportConfig
 * @see PanelModel
 */
export class ModalSupportModel extends HoistModel {
    override xhImpl = true;

    @bindable accessor isModal: boolean = false;

    width: string | number;
    height: string | number;
    canOutsideClickClose: boolean;

    inlineRef = createObservableRef<HTMLElement>();
    modalRef = createObservableRef<HTMLElement>();
    hostNode: HTMLElement;

    constructor({
        width = '90vw',
        height = '90vh',
        defaultModal = false,
        canOutsideClickClose = true
    }: ModalSupportConfig = {}) {
        super();
        this.hostNode = this.createHostNode();
        this.width = width;
        this.height = height;
        this.isModal = defaultModal;
        this.canOutsideClickClose = canOutsideClickClose;

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
        return hostNode;
    }

    toggleIsModal() {
        this.isModal = !this.isModal;
    }

    override destroy() {
        this.hostNode.remove();
        super.destroy();
    }
}
