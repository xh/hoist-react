/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {box, hbox, vbox, filler} from '@xh/hoist/cmp/layout';
import {headerCollapseButton} from './HeaderCollapseButton';

import './PanelHeader.scss';
import {PanelModel} from '../PanelModel';

/**
 * A standardized header for a Panel component
 * @private
 */
@HoistComponent
export class PanelHeader extends Component {

    static modelClass = PanelModel;

    baseClassName = 'xh-panel-header';

    render() {
        let {title, icon, compact, headerItems = []} = this.props,
            {collapsed, vertical, side, showHeaderCollapseButton} = this.model || {};

        if (!title && !icon && !headerItems.length && !showHeaderCollapseButton) return null;

        const titleCls = 'xh-panel-header__title',
            sideCls = `xh-panel-header--${side}`,
            compactCls = compact ? 'xh-panel-header--compact' : null;

        if (!collapsed || vertical) {
            return hbox({
                className: this.getClassName(compactCls),
                items: [
                    icon || null,
                    title ?
                        box({
                            className: titleCls,
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
            // For vertical layout, skip header items.
            const isLeft = side === 'left';
            return vbox({
                className: this.getClassName(sideCls, compactCls),
                flex: 1,
                items: [
                    isLeft ? filler() : this.renderHeaderCollapseButton(),
                    icon || null,
                    title ?
                        box({
                            className: titleCls,
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
        const {model} = this;
        if (!model) return null;

        return model.showHeaderCollapseButton && model.collapsible ?
            headerCollapseButton({model}) :
            null;
    }

    onDblClick = () => {
        const {model} = this;
        if (model && model.collapsible) {
            model.toggleCollapsed();
        }
    };
}

export const panelHeader = elemFactory(PanelHeader);
