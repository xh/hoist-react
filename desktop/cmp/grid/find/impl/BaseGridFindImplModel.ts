/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {Column, GridLikeModel, GridModel} from '@xh/hoist/cmp/grid';
import {CellTextCache} from '@xh/hoist/cmp/grid/impl/FindUtils';
import {isGridLikeModel} from '@xh/hoist/cmp/grid/impl/GridLikeModel';
import {DataViewModel} from '@xh/hoist/cmp/dataview';
import {ZoneGridModel} from '@xh/hoist/cmp/zoneGrid';
import {HoistModel} from '@xh/hoist/core';
import type {FilterMatchOn} from '@xh/hoist/data';
import type {TextInputModel} from '@xh/hoist/desktop/cmp/input';
import {bindable, computed} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';
import {intersection, isArray, isEmpty, without} from 'lodash';
import type {FindFieldControlsModel} from './FindFieldControls';
import type {FindHotkeyTarget} from './FindHotkeys';
import {isOnScreen, registerFindHotkeyTarget, unregisterFindHotkeyTarget} from './FindHotkeys';

/**
 * Base for the impl models behind `GridFindField` - one per mode. Holds the query, the bound grid,
 * the fields to search and Ctrl+F support, leaving matching and moving between matches to each mode.
 * @internal
 */
export abstract class BaseGridFindImplModel
    extends HoistModel
    implements FindFieldControlsModel, FindHotkeyTarget
{
    override xhImpl = true;

    @bindable accessor query: string = null;

    inputRef = createObservableRef<TextInputModel>();

    /** Text shown by cells, kept between searches. */
    protected textCache = new CellTextCache();

    abstract get hasResults(): boolean;
    abstract get countLabel(): string;
    abstract selectNext(): void;
    abstract selectPrev(): void;

    get includeFields(): string[] {
        return this.componentProps.includeFields;
    }

    get excludeFields(): string[] {
        return this.componentProps.excludeFields;
    }

    get matchOn(): FilterMatchOn {
        return this.componentProps.matchOn ?? 'value';
    }

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
    // Fields to search
    //------------------------
    /**
     * Fields to search - the store fields of the visible columns (all mapped columns for a
     * ZoneGrid, all columns with a field for a DataView), limited by `includeFields` and
     * `excludeFields`. Fields given in `includeFields` are searched even if their column is hidden.
     */
    protected getActiveFields(): string[] {
        const {innerGridModel, includeFields, excludeFields} = this,
            searchCols = this.getSearchColumns();

        let ret = ['id', ...innerGridModel.store.fieldNames];
        if (includeFields) ret = intersection(ret, includeFields);
        if (excludeFields) ret = without(ret, ...excludeFields);

        // Push on dot-delimited grid column fields. These are supported by Grid and traverse
        // sub-objects in StoreRecord.data to display nested properties. Given that Grid treats these
        // as first-class fields and displays them w/o the need for renderers, we want to
        // include them here. (But only if their "root" is in the field list derived from the
        // Store and any given include/excludeField configs.)
        searchCols.forEach(col => {
            const {fieldPath} = col;
            if (!isArray(fieldPath)) return;

            const rootFieldPath = fieldPath[0];
            if (ret.includes(rootFieldPath)) {
                ret.push(col.field);
            }
        });

        // Run exclude once more to support explicitly excluding a dot-sep field added above.
        if (excludeFields) ret = without(ret, ...excludeFields);

        // Final filter for column visibility, or explicit request for inclusion. Deliberately not
        // keyed to groupBy, so query results stay stable across regrouping (see #4070).
        ret = ret.filter(f => {
            return (
                (includeFields && includeFields.includes(f)) || searchCols.find(c => c.field === f)
            );
        });

        return ret;
    }

    // See corresponding method in StoreFilterFieldImplModel.
    protected getSearchColumns(): Column[] {
        const {boundModel, innerGridModel} = this;
        if (!boundModel) return [];
        if (boundModel instanceof ZoneGridModel) return boundModel.getMappedColumns();
        if (boundModel instanceof DataViewModel) {
            return innerGridModel.getLeafColumns().filter(it => it.field);
        }
        return innerGridModel.getVisibleLeafColumns();
    }

    //------------------------
    // FindHotkeyTarget
    //------------------------
    get canFocus(): boolean {
        const el = this.inputEl;
        return !!this.innerGridModel && !!el && isOnScreen(el);
    }

    get inputEl(): Element {
        return this.inputRef.current?.domEl ?? null;
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
