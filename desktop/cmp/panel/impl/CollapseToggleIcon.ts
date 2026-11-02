/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Icon} from '@xh/hoist/icon';
import {PanelModel} from '../PanelModel';

/**
 * Chevron for a panel's collapse controls, pointing the way the panel moves when toggled.
 * @internal
 */
export function collapseToggleIcon(panelModel: PanelModel) {
    const {vertical, collapsed, contentFirst} = panelModel,
        towardStart = contentFirst !== collapsed;

    if (vertical) {
        return towardStart ? Icon.panelCollapseToggleUp() : Icon.panelCollapseToggleDown();
    }
    return towardStart ? Icon.panelCollapseToggleLeft() : Icon.panelCollapseToggleRight();
}
