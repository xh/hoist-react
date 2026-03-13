/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FilterBuilderFieldSpec, FilterBuilderModel} from '@xh/hoist/cmp/filter';
import {FilterGroupNode, FilterNode} from '@xh/hoist/cmp/filter/impl/FilterGroupNode';
import {FilterRuleNode} from '@xh/hoist/cmp/filter/impl/FilterRuleNode';
import {box, div, filler, hbox, vbox} from '@xh/hoist/cmp/layout';
import {placeholder} from '@xh/hoist/cmp/layout/Placeholder';
import {hoistCmp, HoistProps, LayoutProps, TestSupportProps, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {
    buttonGroupInput,
    dateInput,
    numberInput,
    select,
    switchInput,
    textInput
} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {getTestId} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isEmpty} from 'lodash';
import './FilterBuilder.scss';

export interface FilterBuilderProps
    extends HoistProps<FilterBuilderModel>, LayoutProps, TestSupportProps {}

/**
 * A panel-based component for constructing filters of arbitrary complexity.
 * Provides a visual query builder UI supporting nested AND/OR groups with NOT negation,
 * type-appropriate value editors, and full integration with Hoist's filter binding system.
 *
 * @see FilterBuilderModel
 */
export const [FilterBuilder, filterBuilder] = hoistCmp.withFactory<FilterBuilderProps>({
    displayName: 'FilterBuilder',
    model: uses(FilterBuilderModel),
    className: 'xh-filter-builder',

    render({model, className, testId, ...props}, ref) {
        const [layoutProps] = splitLayoutProps(props),
            {rootGroup, isEmpty: modelIsEmpty} = model;

        return vbox({
            ref,
            className,
            testId,
            ...layoutProps,
            items: [
                box({
                    flex: 1,
                    overflow: 'auto',
                    className: 'xh-filter-builder__content',
                    item: modelIsEmpty
                        ? placeholder({
                              items: [
                                  Icon.filter(),
                                  'No filter rules defined.',
                                  button({
                                      icon: Icon.add(),
                                      text: 'Add Rule',
                                      outlined: true,
                                      intent: 'primary',
                                      marginTop: 10,
                                      testId: getTestId(testId, 'add-rule'),
                                      onClick: () => model.addRule()
                                  })
                              ]
                          })
                        : filterGroupCard({group: rootGroup, depth: 0, isRoot: true})
                }),
                filterBuilderBbar()
            ]
        });
    }
});

//----------------------------------
// Group Card (recursive)
//----------------------------------
const filterGroupCard = hoistCmp.factory<FilterBuilderModel>({
    render({model, group, depth, isRoot}: any) {
        const canNest = depth < model.maxGroupDepth,
            children = (group as FilterGroupNode).children;

        return vbox({
            className: classNames(
                'xh-filter-builder__group',
                `xh-filter-builder__group--depth-${Math.min(depth, 3)}`,
                {'xh-filter-builder__group--negated': group.not}
            ),
            items: [
                groupHeader({group, depth, isRoot, canNest}),
                ...children.map((child: FilterNode) => {
                    if (child instanceof FilterGroupNode) {
                        return filterGroupCard({
                            key: (child as any).xhId,
                            group: child,
                            depth: depth + 1,
                            isRoot: false
                        });
                    }
                    return filterRuleRow({
                        key: (child as any).xhId,
                        rule: child,
                        parentGroup: group
                    });
                })
            ]
        });
    }
});

//----------------------------------
// Group Header
//----------------------------------
const groupHeader = hoistCmp.factory<FilterBuilderModel>({
    render({model, group, isRoot, canNest}: any) {
        return hbox({
            className: 'xh-filter-builder__group-header',
            alignItems: 'center',
            items: [
                buttonGroupInput({
                    value: group.op,
                    onChange: op => model.setGroupOp(group, op),
                    outlined: true,
                    items: [button({text: 'AND', value: 'AND'}), button({text: 'OR', value: 'OR'})]
                }),
                button({
                    text: 'NOT',
                    outlined: true,
                    active: group.not,
                    intent: group.not ? 'danger' : null,
                    onClick: () => model.setGroupNot(group, !group.not)
                }),
                filler(),
                button({
                    icon: Icon.add(),
                    text: 'Rule',
                    minimal: true,
                    onClick: () => model.addRule(group)
                }),
                button({
                    icon: Icon.add(),
                    text: 'Group',
                    minimal: true,
                    omit: !canNest,
                    onClick: () => model.addGroup(group)
                }),
                button({
                    icon: Icon.delete(),
                    minimal: true,
                    intent: 'danger',
                    omit: isRoot,
                    onClick: () => model.removeNode(group)
                })
            ]
        });
    }
});

//----------------------------------
// Rule Row
//----------------------------------
const filterRuleRow = hoistCmp.factory<FilterBuilderModel>({
    render({model, rule, parentGroup}: any) {
        const ruleNode = rule as FilterRuleNode,
            fieldSpec = ruleNode.field ? model.getFieldSpec(ruleNode.field) : null,
            fieldOptions = model.fieldSpecs.map(spec => ({
                label: spec.displayName,
                value: spec.field
            })),
            opOptions = fieldSpec ? fieldSpec.ops.map(op => ({label: op, value: op})) : [];

        return hbox({
            className: 'xh-filter-builder__rule',
            alignItems: 'center',
            items: [
                hbox({
                    flex: 1,
                    className: 'xh-filter-builder__rule-inputs',
                    alignItems: 'center',
                    items: [
                        select({
                            className: 'xh-filter-builder__rule-field',
                            value: ruleNode.field,
                            options: fieldOptions,
                            enableFilter: true,
                            placeholder: 'Field...',
                            flex: 3,
                            onChange: field => {
                                ruleNode.setField(field);
                                const newSpec = field ? model.getFieldSpec(field) : null;
                                ruleNode.setOp(newSpec?.defaultOperator ?? null);
                                ruleNode.setValue(null);
                            }
                        }),
                        select({
                            className: 'xh-filter-builder__rule-op',
                            value: ruleNode.op,
                            options: opOptions,
                            disabled: !fieldSpec,
                            placeholder: 'Op...',
                            width: 60,
                            hideDropdownIndicator: true,
                            onChange: op => ruleNode.setOp(op)
                        }),
                        renderValueEditor(ruleNode, fieldSpec)
                    ]
                }),
                button({
                    icon: Icon.delete(),
                    minimal: true,
                    intent: 'danger',
                    onClick: () => model.removeNode(ruleNode, parentGroup)
                })
            ]
        });
    }
});

//----------------------------------
// Value Editor (type-mapped)
//----------------------------------
function renderValueEditor(rule: FilterRuleNode, fieldSpec: FilterBuilderFieldSpec) {
    const className = 'xh-filter-builder__rule-value',
        commonProps = {
            className,
            flex: 3,
            value: rule.value,
            disabled: !fieldSpec || !rule.op,
            placeholder: 'Value...',
            onChange: (v: any) => rule.setValue(v)
        };

    if (!fieldSpec) {
        return textInput({...commonProps});
    }

    // Bool fields
    if (fieldSpec.isBoolFieldType) {
        return switchInput({
            className,
            value: rule.value ?? false,
            onChange: (v: any) => rule.setValue(v)
        });
    }

    // Enumerable fields with suggestions for = / !=
    if (fieldSpec.supportsSuggestions(rule.op)) {
        const isMulti = fieldSpec.isCollectionType;
        return select({
            ...commonProps,
            options: fieldSpec.values ?? [],
            enableFilter: true,
            enableMulti: isMulti,
            enableClear: true
        });
    }

    // Date-based fields
    if (fieldSpec.isDateBasedFieldType) {
        return dateInput({
            ...commonProps,
            valueType: fieldSpec.fieldType === 'localDate' ? 'localDate' : 'date'
        });
    }

    // Numeric fields
    if (fieldSpec.isNumericFieldType) {
        return numberInput({...commonProps});
    }

    // Tags
    if (fieldSpec.isCollectionType) {
        return select({
            ...commonProps,
            options: fieldSpec.values ?? [],
            enableMulti: true,
            enableFilter: true,
            enableClear: true
        });
    }

    // Default: text input
    return textInput({...commonProps});
}

//----------------------------------
// Bottom Bar
//----------------------------------
const filterBuilderBbar = hoistCmp.factory<FilterBuilderModel>({
    render({model}) {
        const {commitOnChange, isDirty, isEmpty: modelIsEmpty, persistFavorites} = model;

        return toolbar({
            className: 'xh-filter-builder__bbar',
            items: [
                button({
                    text: 'Clear',
                    disabled: modelIsEmpty,
                    onClick: () => model.clear()
                }),
                filler(),
                favoritesButton({omit: !persistFavorites}),
                button({
                    text: 'Cancel',
                    omit: commitOnChange,
                    disabled: !isDirty,
                    onClick: () => model.cancel()
                }),
                button({
                    text: 'Apply',
                    icon: Icon.check(),
                    intent: 'success',
                    outlined: true,
                    disabled: !isDirty,
                    omit: commitOnChange,
                    onClick: () => model.apply()
                })
            ]
        });
    }
});

//----------------------------------
// Favorites
//----------------------------------
const favoritesButton = hoistCmp.factory<FilterBuilderModel>({
    render({model}) {
        return popover({
            item: button({
                icon: Icon.favorite(),
                text: 'Favorites'
            }),
            content: favoritesMenu(),
            position: 'top-right'
        });
    }
});

const favoritesMenu = hoistCmp.factory<FilterBuilderModel>({
    render({model}) {
        const {favorites, value} = model,
            isFav = value ? model.isFavorite(value) : false,
            items = [];

        if (isEmpty(favorites)) {
            items.push(menuItem({text: 'No favorites saved...', disabled: true}));
        } else {
            favorites.forEach((fav, idx) => {
                items.push(
                    menuItem({
                        key: idx,
                        text: describeFavorite(fav, model),
                        onClick: () => model.loadFavorite(fav),
                        labelElement: button({
                            icon: Icon.delete(),
                            minimal: true,
                            onClick: e => {
                                model.removeFavorite(fav);
                                e.stopPropagation();
                            }
                        })
                    })
                );
            });
        }

        items.push(
            menuDivider({omit: !value || isFav}),
            menuItem({
                icon: Icon.add({intent: 'success'}),
                text: 'Save current filter',
                omit: !value || isFav,
                onClick: () => model.addFavorite()
            })
        );

        return vbox(div({className: 'xh-popup__title', item: 'Favorites'}), menu({items}));
    }
});

function describeFavorite(filter: any, model: FilterBuilderModel): string {
    if (!filter) return 'Empty';
    const json = filter.toJSON();
    if (json.field) {
        const spec = model.getFieldSpec(json.field),
            displayName = spec?.displayName ?? json.field;
        return `${displayName} ${json.op} ${json.value}`;
    }
    if (json.filters) {
        const count = json.filters.length,
            op = json.op || 'AND',
            prefix = json.not ? 'NOT ' : '';
        return `${prefix}${op} (${count} filter${count !== 1 ? 's' : ''})`;
    }
    return 'Filter';
}
