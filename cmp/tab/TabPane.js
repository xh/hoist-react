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
    isLazyState = true;

    constructor(props) {
        super(props);
        this.addAutorun(this.syncLoad);
    }

    render() {
        const {content, isActive} = this.model;
        
        if (isActive) this.isLazyState = false;
        if (this.isLazyState) return null;

        const elemArgs = {flex: 1, ref: this.child.ref},
            item = content.constructor != null ? elem(content, elemArgs) : content(elemArgs);

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

        if (!child.loadAsync) {
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
