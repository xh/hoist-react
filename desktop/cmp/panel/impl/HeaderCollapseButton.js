import {hoistComponent, useProvidedModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {PanelModel} from '../PanelModel';

/**
 * @private
 */
export const [HeaderCollapseButton, headerCollapseButton] = hoistComponent(props => {
    const model = useProvidedModel(PanelModel, props);
    return button({
        icon: Icon[getChevron(model)](),
        onClick: () => model.toggleCollapsed(),
        minimal: true
    });
});

//------------------
// Implementation
//------------------
function getChevron(model) {
    const {vertical, collapsed, contentFirst} = model,
        directions = vertical ? ['chevronUp', 'chevronDown'] : ['chevronLeft', 'chevronRight'],
        idx = (contentFirst != collapsed ? 0 : 1);

    return directions[idx];
}