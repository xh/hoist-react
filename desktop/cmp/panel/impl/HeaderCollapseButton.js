import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

/**
 * @private
 */
@HoistComponent
export class HeaderCollapseButton extends Component {
    render() {
        return button({
            icon: Icon[this.getChevron()](),
            onClick: this.onClick,
            minimal: true
        });
    }

    getChevron() {
        const {vertical, collapsed, contentFirst} = this.model,
            directions = vertical ? ['chevronUp', 'chevronDown'] : ['chevronLeft', 'chevronRight'],
            idx = (contentFirst != collapsed ? 0 : 1);

        return directions[idx];
    }

    onClick = () => {
        this.model.toggleCollapsed();
    }
}

export const headerCollapseButton = elemFactory(HeaderCollapseButton);