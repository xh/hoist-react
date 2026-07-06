/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {br, div, filler, hbox, vbox} from '@xh/hoist/cmp/layout';
import {
    composeGroupPath,
    getGroupLeaf,
    getGroupParent,
    normalizeGroupPath,
    VIEW_GROUP_DELIMITER,
    ViewManagerModel
} from '@xh/hoist/cmp/viewmanager';
import {hoistCmp, HoistProps, LayoutProps} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {elemWithin, pluralize} from '@xh/hoist/utils/js';
import {startCase} from 'lodash';
import {getGroupPathOptions, groupPathDisplay, groupPathOptionRenderer} from './Utils';

export interface GroupEditorProps extends HoistProps, HoistInputProps, LayoutProps {
    value?: string;

    /** Model providing the universe of existing groups for the relevant view bucket. */
    viewManagerModel: ViewManagerModel;

    /** True to source group options from global views, false (default) for owned views. */
    isGlobal?: boolean;

    /**
     * Called when the user renames or re-parents the entire current group (as opposed to moving
     * this single view into a different group). The composed new path will also be committed as
     * this input's value.
     */
    onGroupRename?: (rename: {from: string; to: string}) => void;
}

/**
 * Input displaying a view's (possibly nested) group, with a popover editor allowing the user to
 * either move the view into a different group or rename/re-parent the current group itself.
 *
 * The popover is opened via {@link GroupEditorModel.togglePopover} - pass a ref to this component
 * to receive its model and wire up an external trigger button (e.g. within the field label).
 */
export const [GroupEditor, groupEditor] = hoistCmp.withFactory<GroupEditorProps>({
    displayName: 'GroupEditor',
    className: 'xh-view-manager__group-editor',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, GroupEditorModel);
    }
});

export class GroupEditorModel extends HoistInputModel {
    override xhImpl = true;

    @observable isPopoverOpen: boolean = false;

    @bindable mode: 'move' | 'rename' = 'move';
    @bindable pendingMoveTarget: string = null;
    @bindable pendingLeaf: string = null;
    @bindable pendingParent: string = null;

    get currentGroup(): string {
        return this.renderValue ?? null;
    }

    get isPendingValid(): boolean {
        if (this.isRenameMode) {
            const leaf = this.pendingLeaf?.trim();
            return !!leaf && !leaf.includes(VIEW_GROUP_DELIMITER);
        }
        return true;
    }

    get isRenameMode(): boolean {
        return this.mode === 'rename' && !!this.currentGroup;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    togglePopover() {
        this.isPopoverOpen ? this.cancelPopover() : this.openPopover();
    }

    @action
    openPopover() {
        const {currentGroup} = this;
        this.mode = 'move';
        this.pendingMoveTarget = currentGroup;
        this.pendingLeaf = getGroupLeaf(currentGroup);
        this.pendingParent = getGroupParent(currentGroup);
        this.isPopoverOpen = true;
    }

    @action
    cancelPopover() {
        this.isPopoverOpen = false;
    }

    @action
    commitPopover() {
        if (!this.isPendingValid) return;

        const {currentGroup} = this;
        if (this.isRenameMode) {
            const to = normalizeGroupPath(composeGroupPath(this.pendingParent, this.pendingLeaf));
            if (to !== currentGroup) {
                this.noteValueChange(to);
                this.componentProps.onGroupRename?.({from: currentGroup, to});
            }
        } else {
            this.noteValueChange(normalizeGroupPath(this.pendingMoveTarget));
        }
        this.isPopoverOpen = false;
    }
}

//-----------------------
// Implementation
//-----------------------
const cmp = hoistCmp.factory<GroupEditorProps & {model: GroupEditorModel}>(
    ({model, className}, ref) => {
        return hbox({
            ref,
            className,
            alignItems: 'center',
            item: popover({
                isOpen: model.isPopoverOpen,
                position: 'bottom-left',
                minimal: false,
                item: div({
                    className: 'xh-view-manager__group-editor__value',
                    item: groupPathDisplay(model.renderValue)
                }),
                content: editorPopover(),
                onInteraction: (nextOpenState, e) => {
                    // Close on outside interaction - the external edit button toggles itself.
                    if (
                        model.isPopoverOpen &&
                        !nextOpenState &&
                        e?.target &&
                        !elemWithin(
                            e.target as HTMLElement,
                            'xh-view-manager__group-editor__edit-btn'
                        )
                    ) {
                        model.cancelPopover();
                    }
                }
            })
        });
    }
);

const editorPopover = hoistCmp.factory<GroupEditorModel>({
    render({model}) {
        const {currentGroup, isRenameMode} = model,
            {typeDisplayName} = model.componentProps.viewManagerModel;

        return panel({
            className: 'xh-view-manager__group-editor__popover',
            width: 350,
            items: [
                buttonGroupInput({
                    model,
                    bind: 'mode',
                    omit: !currentGroup,
                    fill: true,
                    items: [
                        button({value: 'move', text: `Move ${startCase(typeDisplayName)}`}),
                        button({value: 'rename', text: 'Edit Group'})
                    ]
                }),
                isRenameMode ? renamePane() : movePane()
            ],
            bbar: toolbar(
                filler(),
                button({text: 'Cancel', onClick: () => model.cancelPopover()}),
                button({
                    text: 'OK',
                    icon: Icon.check(),
                    intent: 'success',
                    disabled: !model.isPendingValid,
                    onClick: () => model.commitPopover()
                })
            )
        });
    }
});

const movePane = hoistCmp.factory<GroupEditorModel>({
    render({model}) {
        const {viewManagerModel, isGlobal} = model.componentProps;
        return vbox({
            className: 'xh-view-manager__group-editor__pane',
            items: [
                select({
                    model,
                    bind: 'pendingMoveTarget',
                    options: getGroupPathOptions(viewManagerModel, isGlobal, {includeRoot: true}),
                    optionRenderer: groupPathOptionRenderer,
                    enableCreate: true,
                    enableFilter: true,
                    placeholder: 'Select or enter a group...',
                    width: null
                }),
                infoText({
                    items: [
                        `Move this ${viewManagerModel.typeDisplayName} into the selected group.`,
                        br(),
                        `Type to create a new group - use "${VIEW_GROUP_DELIMITER}" to nest.`
                    ]
                })
            ]
        });
    }
});

const renamePane = hoistCmp.factory<GroupEditorModel>({
    render({model}) {
        const {viewManagerModel, isGlobal} = model.componentProps;
        return vbox({
            className: 'xh-view-manager__group-editor__pane',
            items: [
                textInput({
                    model,
                    bind: 'pendingLeaf',
                    autoFocus: true,
                    commitOnChange: true,
                    placeholder: 'Group name',
                    onKeyDown: e => {
                        if (e.key === 'Enter') model.commitPopover();
                    },
                    width: null
                }),
                div({className: 'xh-view-manager__group-editor__label', item: 'Nest under'}),
                select({
                    model,
                    bind: 'pendingParent',
                    options: getGroupPathOptions(viewManagerModel, isGlobal, {
                        includeRoot: true,
                        excludeSubtreeOf: model.currentGroup
                    }),
                    optionRenderer: groupPathOptionRenderer,
                    enableFilter: true,
                    width: null
                }),
                infoText({
                    items: `Renames this group for all ${pluralize(viewManagerModel.typeDisplayName)} within it.`
                })
            ]
        });
    }
});

const infoText = hoistCmp.factory({
    render({children}) {
        return div({
            className: 'xh-view-manager__group-editor__info xh-text-color-muted',
            items: children
        });
    }
});
