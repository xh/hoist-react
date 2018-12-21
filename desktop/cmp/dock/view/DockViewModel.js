/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {withDefault} from '@xh/hoist/utils/js';

@HoistModel
export class DockViewModel {

    // Todo - wire up reference to parent container
    parent = null;

    @observable docked = false;
    @observable collapsed = false;

    id = null;
    title = null;
    icon = null;
    width = null;
    viewFactory = null;
    viewModel = null;
    viewProps = null;

    /**
     * @param {string} id - unique identifier for this DockViewModel.
     * @param {string|function} title - title, or function to generate. Receives (viewModel).
     * @param {Icon|function} icon - icon, or function to generate. Receives (viewModel).
     * @param {width|function} width - width, or function to generate. Receives (viewModel).
     * @param {boolean} docked - true to initialise in dock, false to use Dialog.
     * @param {boolean} collapsed - true to initialise collapsed, false for expanded.
     * @param {elemFactory} viewFactory - elemFactory for child view.
     * @param {HoistModel} viewModel - HoistModel for child view.
     * @param {Object} viewProps - props for child view.
     */
    constructor({
        id,
        title,
        icon,
        width,
        docked,
        collapsed,
        viewFactory,
        viewModel,
        viewProps
    }) {
        this.id = withDefault(id, XH.genId());
        this.title = title;
        this.icon = icon;
        this.width = width;
        this.docked = withDefault(docked, false);
        this.collapsed = withDefault(collapsed, false);
        this.viewFactory = viewFactory;
        this.viewModel = viewModel;

        const props = withDefault(viewProps, {});
        if (viewModel) props.model = viewModel;
        this.viewProps = props;
    }

    //-----------------------
    // Docked state
    //-----------------------
    toggleDocked() {
        if (this.collapsed) {
            this.showInDock();
            this.expand();
        } else if (this.docked) {
            this.showInDialog();
        } else {
            this.showInDock();
        }
    }

    @action
    showInDialog() {
        this.docked = false;
    }

    @action
    showInDock() {
        this.docked = true;
    }

    //-----------------------
    // Collapsed state
    //-----------------------
    toggleCollapsed() {
        if (this.collapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    }

    @action
    expand() {
        this.collapsed = false;
    }

    @action
    collapse() {
        this.collapsed = true;
    }

    //-----------------------
    // Actions
    //-----------------------
    close() {
        // Todo: Revisit this - need a generalised way for docked views to understand (and cancel?) requests to close
        const {model} = this.viewProps;
        if (model && model.onClose) {
            model.onClose();
        } else {
            this.parent.removeView(this.id);
        }
    }

}