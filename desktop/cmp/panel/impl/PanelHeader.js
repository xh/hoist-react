/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {box, hbox, vbox, filler} from '@xh/hoist/cmp/layout';
import {headerCollapseButton} from './HeaderCollapseButton';

import './PanelHeader.scss';

/**
 * A standardized header for a Panel component
 * @private
 */
@HoistComponent
export class PanelHeader extends Component {
    render() {
        let {title, icon, headerItems = [], sizingModel} = this.props,
            {collapsed, vertical, side, showHeaderCollapseButton} = sizingModel || {};

        if (!title && !icon && !headerItems.length && !showHeaderCollapseButton) return null;

        if (!collapsed || vertical) {
            return hbox({
                className: 'xh-panel-header',
                items: [
                    icon || null,
                    title ?
                        box({
                            className: 'xh-panel-header-title',
                            flex: 1,
                            item: title
                        }) :
                        filler(),
                    ...(!collapsed ? headerItems : []),
                    this.renderHeaderCollapseButton()
                ],
                onDoubleClick: this.onDblClick
            });
        } else {
            // For Compressed vertical layout, skip header items.
            const isLeft = side === 'left';
            return vbox({
                className: `xh-panel-header xh-panel-header-${side}`,
                flex: 1,
                items: [
                    isLeft ? filler() : this.renderHeaderCollapseButton(),
                    icon || null,
                    title ?
                        box({
                            className: 'xh-panel-header-title',
                            item: title
                        }) :
                        null,
                    !isLeft ? filler() : this.renderHeaderCollapseButton()
                ],
                onDoubleClick: this.onDblClick
            });
        }
    }

    renderHeaderCollapseButton() {
        const {sizingModel} = this.props;
        if (!sizingModel) return null;

        return sizingModel.showHeaderCollapseButton && sizingModel.collapsible ?
            headerCollapseButton({model: sizingModel}) :
            null;
    }

    onDblClick = () => {
        const {sizingModel} = this.props;
        if (sizingModel && sizingModel.collapsible) {
            sizingModel.toggleCollapsed();
        }
    };
}

export const panelHeader = elemFactory(PanelHeader);
