import {HoistModel} from '@xh/hoist/core';
import {makeObservable, bindable} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';


/**
 * @private
 */
export class ModalSupportModel extends HoistModel {

    @bindable isModal = false;

    inlineRef = createObservableRef();
    modalRef = createObservableRef();
    hostNode;

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

    createHostNode() {
        const hostNode = document.createElement('div');
        hostNode.style.all = 'inherit';
        document.body.appendChild(hostNode);
        return hostNode;
    }

    toggleIsModal() {
        this.setIsModal(!this.isModal);
    }

    destroy() {
        this.hostNode.remove();
        super.destroy();
    }
}