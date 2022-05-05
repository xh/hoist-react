import {HoistModel} from '@xh/hoist/core';
import {createObservableRef} from '@xh/hoist/utils/react';
import {action, makeObservable, observable} from 'mobx';

export class FullScreenSupportModel extends HoistModel {
    @observable isFullScreen = false;
    inlineRef = createObservableRef();
    modalRef = createObservableRef();
    hostNode;

    constructor() {
        super();
        makeObservable(this);
        this.hostNode = this.createHostNode();

        const {inlineRef, modalRef, hostNode} = this;
        this.addReaction({
            track: () => [inlineRef.current, modalRef.current, this.isFullScreen],
            run: () => {
                if (this.isFullScreen) {
                    modalRef.current?.appendChild(hostNode);
                } else {
                    inlineRef.current?.appendChild(hostNode);
                }
            }
        });
    }

    createHostNode() {
        const hostNode = document.createElement('div');
        hostNode.style.all = 'inherit';
        document.body.appendChild(hostNode);
        return hostNode;
    }

    @action
    toggleFullScreen() {
        this.isFullScreen = !this.isFullScreen;
    }

    destroy() {
        this.hostNode.remove();
        super.destroy();
    }
}