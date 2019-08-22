import {hoistComponentFactory, useProvidedModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {PanelModel} from '../PanelModel';

/** @private */
export const headerCollapseButton = hoistComponentFactory(
    (props) => {
        const model = useProvidedModel(PanelModel, props);
        return button({
            icon: Icon[getChevron(model)](),
            onClick: () => model.toggleCollapsed(),
            minimal: true
        });
    }
);

function getChevron(model) {
    const {vertical, collapsed, contentFirst} = model,
        directions = vertical ? ['chevronUp', 'chevronDown'] : ['chevronLeft', 'chevronRight'],
        idx = (contentFirst != collapsed ? 0 : 1);

    return directions[idx];
}