/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {hoistCmp, HoistModel, lookup, useLocalModel, uses} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {box, hframe} from '@xh/hoist/cmp/layout';
import '@xh/hoist/desktop/register';
import {popover} from '@xh/hoist/kit/blueprint';
import {getLayoutProps} from '@xh/hoist/utils/react';
import './PopoverFilterChooser.scss';
import {filterChooser, FilterChooserProps} from './FilterChooser';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';

/**
 * A wrapper around a FilterChooser that renders in a popover when opened, allowing it to expand
 * vertically beyond the height of a toolbar.
 * @see FilterChooser
 */
export const [PopoverFilterChooser, popoverFilterChooser] =
    hoistCmp.withFactory<FilterChooserProps>({
        model: uses(FilterChooserModel),
        className: 'xh-popover-filter-chooser',
        render({model, className, ...props}, ref) {
            const layoutProps = getLayoutProps(props),
                impl = useLocalModel(PopoverFilterChooserLocalModel);

            return box({
                ref,
                className,
                ...layoutProps,
                item: popover({
                    isOpen: impl.popoverIsOpen,
                    popoverClassName: 'xh-popover-filter-chooser__popover',
                    item: hframe(
                        filterChooser({
                            model,
                            // Omit when popover is open to force update the inputRef
                            omit: impl.popoverIsOpen,
                            className: 'xh-popover-filter-chooser__filter-chooser',
                            displayCount: true,
                            ...props,
                            disabled: true
                        })
                    ),
                    content: filterChooser({
                        model,
                        displayCount: true,
                        ...props
                    }),
                    matchTargetWidth: true,
                    minimal: true,
                    position: 'bottom',
                    onInteraction: open => {
                        if (open) {
                            impl.open();
                        } else {
                            impl.close();
                        }
                    }
                })
            });
        }
    });

class PopoverFilterChooserLocalModel extends HoistModel {
    override xhImpl = true;

    @lookup(FilterChooserModel)
    model: FilterChooserModel;

    @bindable
    popoverIsOpen: boolean = false;

    get displaySelectValue() {
        return this.model.selectValue[0];
    }

    constructor() {
        super();
        makeObservable(this);
    }

    open() {
        this.popoverIsOpen = true;

        // Focus and open the menu when rendered
        this.addReaction({
            when: () => !!this.model.inputRef.current,
            run: () => {
                const inputRef = this.model.inputRef.current;
                inputRef.focus();
                (inputRef as any).reactSelectRef.current.select.onMenuOpen();
            }
        });
    }

    close() {
        this.popoverIsOpen = false;
    }
}
