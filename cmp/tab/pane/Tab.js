/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elem, elemFactory, HoistComponent} from '@xh/hoist/core';
import {Ref} from '@xh/hoist/utils/Ref';
import {frame} from '@xh/hoist/cmp/layout';
import {TabModel} from './TabModel';

/**
 * Wrapper for contents to be shown within a TabContainer. This is used by TabContainer's internal
 * implementation and not typically rendered directly by applications.
 *
 * This wrapper component provides a default implementation of the following behavior:
 *
 *   - Mounts/unmounts its contents according to TabContainerModel.tabRenderMode.
 *   - Reloads its contents whenever it is visible or when it is made visible and has not been
 *      refreshed since the last refresh request on the TabContainerModel.
 *   - Stretches its contents using a flex layout.
 *
 * Contained components that load data/state from the server should implement loadAsync(),
 * but generally leave the calling of that method to this component.
 */
@HoistComponent()
export class Tab extends Component {

    static propTypes = {
        /** The controlling TabModel instance. */
        model: PT.instanceOf(TabModel).isRequired
    };

    child = new Ref();
    wasActivated = false;

    constructor(props) {
        super(props);
        this.addAutorun(this.syncLoad);
    }

    render() {
        const {content, isActive, containerModel} = this.model,
            mode = containerModel.tabRenderMode;

        this.wasActivated = this.wasActivated || isActive;

        if (!isActive && (mode == 'removeOnHide' || !this.wasActivated && mode == 'lazy')) {
            return null;
        }

        const item = content.prototype.render ?
            elem(content, {flex: 1, ref: this.child.ref}) :
            content({flex: 1});
        
        return frame({
            display: isActive ? 'flex' : 'none',
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
export const tab = elemFactory(Tab);
