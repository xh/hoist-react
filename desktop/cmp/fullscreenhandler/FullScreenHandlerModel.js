import {HoistModel} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {createObservableRef} from '@xh/hoist/utils/react';
import {makeObservable, observable, runInAction} from 'mobx';

export class FullScreenHandlerModel extends HoistModel {
    @observable isFullScreen = false;
    reusableNode = document.createElement('div');
    containerRefs = {fullScreen: createObservableRef(), host: createObservableRef()};
    onFullScreenChange;

    constructor() {
        super();
        makeObservable(this);
        this.initReusableNode();
    }

    initReusableNode() {
        const {reusableNode} = this;
        reusableNode.style.all = 'inherit';
        document.body.appendChild(reusableNode);
    }

    afterLinked() {
        this.addReaction({
            track: () => this.containerRefs.fullScreen.current,
            run: (isFullScreen) => {
                const {containerRefs, reusableNode} = this;
                if (isFullScreen) {
                    containerRefs.fullScreen.current.appendChild(reusableNode);
                } else {
                    containerRefs.host.current.appendChild(reusableNode);
                }
            },
            fireImmediately: true
        });
    }

    toggleFullScreen() {
        runInAction(() => {this.isFullScreen = !this.isFullScreen});
        wait().then(() => {this.onFullScreenChange?.(this.isFullScreen)});
    }
}