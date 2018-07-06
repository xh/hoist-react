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
 * Wrapper for Components to be shown inside of a TabContainer tab. Provides the following:
 *
 *   - Lazily renders the contents of the tab only when it first becomes active.
 *   - Reloads the active tab whenever its lastLoaded is out of date with its parent's 'lastRefreshRequest'.
 *   - Stretches the content of the child component using a flex layout.
 *
 * Contained components that load data/state from the server should implement loadAsync(), but
 * generally leave the calling of that method to this component
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
