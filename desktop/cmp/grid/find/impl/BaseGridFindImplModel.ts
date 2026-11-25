/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {GridLikeModel, GridModel} from '@xh/hoist/cmp/grid';
import {isGridLikeModel} from '@xh/hoist/cmp/grid/impl/GridLikeModel';
import {HoistModel} from '@xh/hoist/core';
import type {TextInputModel} from '@xh/hoist/desktop/cmp/input';
import {bindable, computed} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';
import {isEmpty} from 'lodash';
import type {FindFieldControlsModel} from './FindFieldControls';
import type {FindHotkeyTarget} from './FindHotkeys';
import {registerFindHotkeyTarget, unregisterFindHotkeyTarget} from './FindHotkeys';

/**
 * Base for the impl models behind `GridFindField` - one per mode. Holds the query, the bound grid
 * and Ctrl+F support, leaving matching and moving between matches to each mode.
 * @internal
 */
export abstract class BaseGridFindImplModel
    extends HoistModel
    implements FindFieldControlsModel, FindHotkeyTarget
{
    override xhImpl = true;

    @bindable accessor query: string = null;

    inputRef = createObservableRef<TextInputModel>();

    abstract get hasResults(): boolean;
    abstract get countLabel(): string;
    abstract selectNext(): void;
    abstract selectPrev(): void;

    get queryBuffer(): number {
        return this.componentProps.queryBuffer ?? 200;
    }

    get hasFocus(): boolean {
        return this.inputRef?.current?.hasFocus;
    }

    @computed
    get hasQuery(): boolean {
        return !isEmpty(this.query);
    }

    /** Model to search - from props, or the nearest found in context. */
    @computed
    get boundModel(): GridLikeModel {
        return this.componentProps.gridModel ?? this.lookupModel(isGridLikeModel);
    }

    get innerGridModel(): GridModel {
        return this.boundModel?.innerGridModel ?? null;
    }

    override onLinked() {
        this.addReaction({
            track: () => !!this.componentProps.enableHotkey,
            run: enable =>
                enable ? registerFindHotkeyTarget(this) : unregisterFindHotkeyTarget(this),
            fireImmediately: true
        });
    }

    override destroy() {
        unregisterFindHotkeyTarget(this);
        super.destroy();
    }

    //------------------------
    // FindHotkeyTarget
    //------------------------
    get canFocus(): boolean {
        const el = this.inputRef.current?.domEl;
        return !!this.innerGridModel && !!el && el.getClientRects().length > 0;
    }

    contains(el: Element): boolean {
        return !!(
            this.inputRef.current?.domEl?.contains(el) ||
            this.innerGridModel?.viewRef.current?.contains(el)
        );
    }

    focusInput() {
        const input = this.inputRef.current;
        input?.focus();
        input?.select();
    }
}
