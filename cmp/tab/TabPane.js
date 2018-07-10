/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';

import {elem, elemFactory, HoistComponent} from '@xh/hoist/core';
import {Ref} from '@xh/hoist/utils/Ref';
import {frame} from '@xh/hoist/cmp/layout';

/**
 * Wrapper for contents to be shown in a particular 'pane' of a TabContainer.
 * This is used by TabContainer's internal implementation and not typically
 * rendered directly by applications.
 *
 * This pane provides a default implementation of the following behavior:
 *
 *   - Mounting/unmounting its contents according to TabContainerModel.paneRenderMode.
 *   - Reloading its contents whenever it is visible, or made visible and has not been
 *      refreshed since the last refresh request on the TabContainerModel.
 *   - Stretching its contents using a flex layout.
 *
 * Contained components that load data/state from the server should implement loadAsync(), but
 * generally leave the calling of that method to this component.
 */
@HoistComponent()
export class TabPane extends Component {

    child = new Ref();
    wasActivated = false;

    constructor(props) {
        super(props);
        this.addAutorun(this.syncLoad);
    }

    render() {
        const {content, isActive, container} = this.model,
            mode = container.paneRenderMode;

        this.wasActivated = this.wasActivated || isActive;

        if (!isActive && (mode == 'removeOnHide' || !this.wasActivated && mode == 'lazy')) {
            return null;
        }

        const item = content.prototype.render ?
            elem(content, {flex: 1, ref: this.child.ref}) :
            content({flex: 1});
        
        return frame({
            display: isActive ? 'flex' : 'none',
            cls: 'xh-tab-pane',
            item
        });
    }


    //------------------------
    // Implementation
    //------------------------
    loadChild() {
        const {model} = this,
            child = this.child.value;

        if (!child || !child.loadAsync) {  // Anonymous panels won't have a loadAsync method, that's ok.
            model.markLoaded();
        } else {
            child.loadAsync()
                .finally(() => model.markLoaded())
                .linkTo(model.loadState)
                .catchDefault();
        }
    }

    syncLoad() {
        if (this.model.needsLoad && this.child.value) {
            this.loadChild();
        }
    }
}
export const tabPane = elemFactory(TabPane);
