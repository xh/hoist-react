/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {div, hbox, vbox, span, filler} from '@xh/hoist/cmp/layout';
import {dialog} from '@xh/hoist/kit/blueprint';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {isFunction} from 'lodash';

import {DockViewModel} from './DockViewModel';
import '../Dock.scss';

@HoistComponent
export class DockView extends Component {

    static modelClass = DockViewModel;

    baseClassName = 'xh-dock-view';

    render() {
        const {model} = this;
        return model.collapsed || model.docked ? this.renderInDock() : this.renderInDialog();
    }

    renderInDock() {
        const {collapsed} = this.model,
            width = this.getWidth(),
            style = collapsed ? {maxWidth: width} : {width};

        return vbox({
            style,
            className: this.getClassName(collapsed ? 'xh-dock-view-collapsed' : null),
            items: [
                this.renderHeader(),
                this.renderBody()
            ]
        });
    }

    renderInDialog() {
        const width = this.getWidth(),
            style = {width};

        return dialog({
            style,
            className: this.getClassName('xh-dock-view-dialog'),
            isOpen: true,
            onClose: () => this.onClose(),
            canOutsideClickClose: false,
            transitionName: 'none',
            items: [
                this.renderHeader(),
                this.renderBody()
            ]
        });
    }

    renderHeader() {
        const {collapsed, docked} = this.model;

        return hbox({
            className: 'xh-dock-view-header',
            items: [
                span({
                    className: 'xh-dock-view-header-icon',
                    onDoubleClick: () => this.onToggleCollapsed(),
                    item: this.renderIcon()
                }),
                span({
                    className: 'xh-dock-view-header-title',
                    onDoubleClick: () => this.onToggleCollapsed(),
                    item: this.renderTitle()
                }),
                filler(),
                button({
                    icon: collapsed ? Icon.angleUp() : Icon.angleDown(),
                    onClick: () => this.onToggleCollapsed()
                }),
                button({
                    icon: docked ? Icon.expand() : Icon.collapse(),
                    onClick: () => this.onToggleDocked()
                }),
                button({
                    icon: Icon.close(),
                    onClick: () => this.onClose()
                })
            ]
        });
    }

    renderBody() {
        const {viewFactory, viewProps} = this.model;
        return div({
            className: 'xh-dock-view-body',
            item: viewFactory(viewProps)
        });
    }

    renderIcon() {
        const {viewModel, icon} = this.model;
        return isFunction(icon) ? icon(viewModel) : icon;
    }

    renderTitle() {
        const {viewModel, title} = this.model;
        return isFunction(title) ? title(viewModel) : title;
    }

    getWidth() {
        const {viewModel, width} = this.model;
        return isFunction(width) ? width(viewModel) : width;
    }

    onToggleDocked = () => {
        this.model.toggleDocked();
    };

    onToggleCollapsed = () => {
        this.model.toggleCollapsed();
    };

    onClose = () => {
        this.model.close();
    };

}

export const dockView = elemFactory(DockView);