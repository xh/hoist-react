/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {
    HoistModel,
    managed,
    PersistenceProvider,
    PersistOptions,
    PlainObject,
    TaskObserver,
    XH
} from '@xh/hoist/core';
import {
    combineValueFilters,
    CompoundFilter,
    FieldFilter,
    Filter,
    parseFilter,
    Store,
    View,
    withFilterByTypes
} from '@xh/hoist/data';
import {CompoundFilterSpec, FieldFilterSpec, FilterLike} from '@xh/hoist/data/filter/Types';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {ReactNode} from 'react';
import {
    cloneDeep,
    compact,
    flatMap,
    flatten,
    forEach,
    groupBy,
    isArray,
    isEmpty,
    isFinite,
    isFunction,
    isString,
    partition,
    sortBy,
    uniq,
    uniqBy
} from 'lodash';

import {FilterChooserFieldSpec, FilterChooserFieldSpecConfig} from './FilterChooserFieldSpec';
import {compoundFilterOption, fieldFilterOption, FilterChooserOption} from './impl/Option';
import {QueryEngine} from './impl/QueryEngine';

export interface FilterChooserConfig {
    /**
     * Specifies the fields this model supports for filtering and customizes how their available values
     * will be parsed and displayed. If a `valueSource` is provided, these may be specified as field
     * names in that source or omitted entirely, indicating that all fields should be filter-enabled.
     */
    fieldSpecs?: Array<FilterChooserFieldSpecConfig | string>;

    /** Default properties to be assigned to all FilterChooserFieldSpecs created by this model. */
    fieldSpecDefaults?: Partial<FilterChooserFieldSpecConfig>;

    /**
     * Store or cube View that should actually be filtered as this model's value changes.
     * This may be the same as `valueSource`. Leave undefined if you wish to combine this model's values
     * with other filters, send it to the server, or otherwise observe and handle value changes manually.
     */
    bind?: Store | View;

    /**
     * Store or cube View to be used to lookup matching Field-level defaults for `fieldSpecs` and to
     * provide suggested data values (if so configured) from user input. Defaults to `bind` if provided.
     */
    valueSource?: Store | View;

    /**
     * Configuration for a filter appropriate to be rendered and managed by FilterChooser, or a function
     * to produce the same. Note that FilterChooser currently can only edit and create a flat collection
     * of FieldFilters, to be 'AND'ed together.
     */
    initialValue?: FilterChooserFilterLike | (() => FilterChooserFilterLike);

    /**
     * Initial favorites as an array of filter configurations, or a function to produce such an array.
     */
    initialFavorites?: FilterChooserFilterLike[] | (() => FilterChooserFilterLike[]);

    /**
     * true to offer all field suggestions when the control is focused with an empty query,
     * to aid discoverability.
     */
    suggestFieldsWhenEmpty?: boolean;

    /**
     * true (default) to sort field suggestions by displayed label. Set to false to preserve
     * the order provided to `fieldSpecs`.
     */
    sortFieldSuggestions?: boolean;

    /**
     * Maximum number of filter tags to render before disabling the control.
     * Limits the performance impact of rendering large filters.
     */

    maxTags?: number;

    /** Maximum number of dropdown options to show before truncating. */
    maxResults?: number;

    /**
     * Blurb displayed above field suggestions when the control is focused but user has yet
     * to enter a query, or null to suppress default. */
    introHelpText?: ReactNode;

    /** Options governing persistence. */
    persistWith?: FilterChooserPersistOptions;
}

export class FilterChooserModel extends HoistModel {
    @observable.ref value: Filter = null;
    @observable.ref favorites: Filter[] = [];
    bind: Store | View;
    valueSource: Store | View;

    @managed fieldSpecs: FilterChooserFieldSpec[] = [];

    suggestFieldsWhenEmpty: boolean;
    sortFieldSuggestions: boolean;
    maxTags: number;
    maxResults: number;
    introHelpText: ReactNode;

    @managed provider: PersistenceProvider;
    persistValue: boolean = false;
    persistFavorites: boolean = false;

    /** Tracks execution of filtering operation on bound object.*/
    @managed filterTask = TaskObserver.trackAll();

    // Implementation fields for Control
    @managed queryEngine: QueryEngine;
    @observable.ref selectOptions: FilterChooserOption[];
    @observable.ref selectValue: string[];
    @observable favoritesIsOpen = false;
    @observable unsupportedFilter = false;
    inputRef = createObservableRef<HTMLElement>();

    constructor({
        fieldSpecs,
        fieldSpecDefaults,
        bind = null,
        valueSource = bind,
        initialValue = null,
        initialFavorites = [],
        suggestFieldsWhenEmpty = true,
        sortFieldSuggestions = true,
        maxTags = 100,
        maxResults = 50,
        persistWith,
        introHelpText
    }: FilterChooserConfig = {}) {
        super();
        makeObservable(this);

        this.bind = bind;
        this.valueSource = valueSource;
        this.fieldSpecs = this.parseFieldSpecs(fieldSpecs, fieldSpecDefaults);
        this.suggestFieldsWhenEmpty = !!suggestFieldsWhenEmpty;
        this.sortFieldSuggestions = sortFieldSuggestions;
        this.maxTags = maxTags;
        this.maxResults = maxResults;
        this.introHelpText = withDefault(introHelpText, this.getDefaultIntroHelpText());
        this.queryEngine = new QueryEngine(this);

        let value = isFunction(initialValue) ? initialValue() : initialValue,
            favorites = (isFunction(initialFavorites) ? initialFavorites() : initialFavorites).map(
                f => parseFilter(f)
            );

        // Read state from provider -- fail gently
        if (persistWith) {
            try {
                this.provider = PersistenceProvider.create({path: 'filterChooser', ...persistWith});
                this.persistValue = persistWith.persistValue ?? true;
                this.persistFavorites = persistWith.persistFavorites ?? true;

                const state = this.provider.read();
                if (this.persistValue && state?.value) {
                    value = state.value;
                }
                if (this.persistFavorites && state?.favorites) {
                    favorites = state.favorites.map(f => parseFilter(f));
                }

                this.addReaction({
                    track: () => this.persistState,
                    run: state => this.provider.write(state)
                });
            } catch (e) {
                console.error(e);
                XH.safeDestroy(this.provider);
                this.provider = null;
            }
        }

        this.setValue(value);
        this.setFavorites(favorites);

        if (bind) {
            this.addReaction({
                track: () => bind.filter,
                run: filter => {
                    const value = withFilterByTypes(filter, null, 'FunctionFilter');
                    this.setValue(value);
                }
            });
        }
    }

    /**
     * Set the value displayed by this control.
     *
     * Supports one or more FieldFilters to be 'AND'ed together, or
     * an 'AND' CompoundFilter containing such a collection of FieldFilters.
     *
     * 'OR' CompoundFilters or nested CompoundFilters are partially supported -
     * they will be displayed as tags and can be removed, but not created using
     * the control.
     *
     * Any other Filter is unsupported and will cause the control to show a placeholder error.
     */
    @action
    setValue(rawValue: FilterLike) {
        const {bind, maxTags} = this;
        try {
            const value = parseFilter(rawValue);
            if (this.value?.equals(value)) return;

            // 1) Ensure FilterChooser can handle the requested value.
            const isValid = this.validateFilter(value),
                displayFilters = isValid ? this.toDisplayFilters(value) : null;

            this.unsupportedFilter = !isValid || (maxTags && displayFilters.length > maxTags);
            if (this.unsupportedFilter) {
                this.value = null;
                this.selectOptions = null;
                this.selectValue = null;
                return;
            }

            // 2) Main path - set internal value.
            console.debug('Setting FilterChooser value:', value);
            this.value = value;

            // 3) Set props on select input needed to display
            // Build list of options, used for displaying tags. We combine the needed
            // options for the current filter tags with any previous ones to ensure
            // tags are rendered correctly throughout the transition.
            const newOptions = displayFilters.map(f => this.createFilterOption(f)),
                previousOptions = this.selectOptions ?? [],
                options = uniqBy([...newOptions, ...previousOptions], 'value');

            this.selectOptions = !isEmpty(options) ? options : null;

            // 4) Do the next steps asynchronously for UI responsiveness and to ensure the component
            // is ready to render the tags correctly (after selectOptions set above).
            wait()
                .thenAction(() => {
                    // No-op if we've already re-entered this method by the time this async routine runs.
                    if (this.value !== value) {
                        return;
                    }

                    this.selectValue = sortBy(
                        displayFilters.map(f => JSON.stringify(f)),
                        f => {
                            const idx = this.selectValue?.indexOf(f);
                            return isFinite(idx) && idx > -1 ? idx : displayFilters.length;
                        }
                    );

                    // 5) Round-trip value to bound filter
                    if (bind) {
                        const filter = withFilterByTypes(bind.filter, value, [
                            'FieldFilter',
                            'CompoundFilter'
                        ]);
                        bind.setFilter(filter);
                    }
                })
                .linkTo(this.filterTask);
        } catch (e) {
            console.error('Failed to set value on FilterChooserModel', e);
            this.value = null;
            this.selectOptions = null;
            this.selectValue = null;
            this.unsupportedFilter = true;
        }
    }

    //---------------------------
    // Value Handling/Processing
    //---------------------------
    setSelectValue(selectValue: string[]) {
        // Rehydrate stringified values
        const parsedValues = compact(flatten(selectValue)).map(it => JSON.parse(it));

        // Separate actual selected filters from field suggestion.
        // (the former is just a transient value on the select control only)
        const [filters, suggestions] = partition(parsedValues, 'op');

        // Round-trip actual filters through main value setter above.
        this.setValue(combineValueFilters(filters));

        // And then programmatically re-enter any suggestion
        if (suggestions.length === 1) this.autoComplete(suggestions[0]);
    }

    // Transfer the value filter to the canonical set of individual filters for display.
    // Filters with arrays values will be split.
    toDisplayFilters(filter: Filter) {
        if (!filter) return [];

        let ret;
        const unsupported = s => {
            throw XH.exception(`Unsupported Filter in FilterChooserModel: ${s}`);
        };

        // 1) Flatten CompoundFilters across disparate fields to FieldFilters.
        if (filter instanceof CompoundFilter && !filter.field) {
            ret = filter.filters;
        } else {
            ret = [filter];
        }
        if (ret.some(f => !(f instanceof FieldFilter) && !(f instanceof CompoundFilter))) {
            unsupported('Filters must be FieldFilters or CompoundFilters.');
        }

        // 2) Recognize unsupported multiple filters for array-based filters.
        const groupMap = groupBy(ret, ({op, field}) => `${op}|${field}`);
        forEach(groupMap, filters => {
            const {op} = filters[0];
            if (filters.length > 1 && FieldFilter.ARRAY_OPERATORS.includes(op)) {
                unsupported(`Multiple filters cannot be provided with ${op} operator`);
            }
        });

        // 3) Finally unroll multi-value filters to one value per filter.
        // The multiple values will later be restored.
        return flatMap(ret, f => {
            return isArray(f.value) ? f.value.map(value => new FieldFilter({...f, value})) : f;
        });
    }

    //-------------
    // Querying
    //---------------
    async queryAsync(query: string): Promise<FilterChooserOption[]> {
        return this.queryEngine.queryAsync(query);
    }

    //--------------------
    // Autocomplete
    //--------------------
    autoComplete(value) {
        const rsSelectCmp = (this.inputRef.current as any)?.reactSelectRef?.current;
        if (!rsSelectCmp) return;

        const currentVal = rsSelectCmp.select.state.inputValue,
            newVal = value.displayName,
            inputValue = newVal.length > currentVal.length ? newVal : currentVal;

        rsSelectCmp.select.setState({inputValue, menuIsOpen: true});
        wait()
            .then(() => {
                rsSelectCmp.focus();
                rsSelectCmp.handleInputChange(inputValue);
            })
            .thenAction(() => {
                // Setting the Select's `inputValue` state above has the side-effect of modifying
                // it's internal `value`. Force synchronise its `value` to our bound `selectValue`
                // to get it back inline. Note we're intentionally not using `setSelectValue()`,
                // which returns early if the actual filter value hasn't changed.
                this.selectValue = cloneDeep(this.selectValue);
            });
    }

    //---------------------------------
    // Options
    //---------------------------------
    createFilterOption(filter: Filter): FilterChooserOption {
        if (filter instanceof FieldFilter) {
            return fieldFilterOption({filter, fieldSpec: this.getFieldSpec(filter.field)});
        } else if (filter instanceof CompoundFilter) {
            const fieldNames = uniq(
                filter.filters.map(it => this.getFieldSpec((it as FieldFilter).field)?.displayName)
            );
            return compoundFilterOption({filter, fieldNames});
        }
    }

    //--------------------
    // Favorites
    //--------------------
    get favoritesOptions() {
        return this.favorites.map(value => ({
            value,
            filterOptions: this.toDisplayFilters(value).map(f => this.createFilterOption(f))
        }));
    }

    @action
    openFavoritesMenu() {
        this.favoritesIsOpen = true;
    }

    @action
    closeFavoritesMenu() {
        this.favoritesIsOpen = false;
    }

    @action
    setFavorites(favorites: Filter[]) {
        this.favorites = favorites.filter(f => this.validateFilter(f));
    }

    @action
    addFavorite(filter: Filter) {
        if (isEmpty(filter) || this.isFavorite(filter)) return;
        this.favorites = [...this.favorites, filter];
    }

    @action
    removeFavorite(filter: Filter) {
        this.favorites = this.favorites.filter(f => !f.equals(filter));
    }

    findFavorite(filter: Filter): Filter {
        return this.favorites?.find(f => f.equals(filter));
    }

    isFavorite(filter: Filter): boolean {
        return !!this.findFavorite(filter);
    }

    //-------------------------
    // Persistence handling
    //-------------------------
    get persistState() {
        const ret: PlainObject = {};
        if (this.persistValue) ret.value = this.value;
        if (this.persistFavorites) ret.favorites = this.favorites;
        return ret;
    }

    //--------------------------------
    // FilterChooserFieldSpec handling
    //--------------------------------
    parseFieldSpecs(
        specs: Array<FilterChooserFieldSpecConfig | string>,
        fieldSpecDefaults: Partial<FilterChooserFieldSpecConfig>
    ): Array<FilterChooserFieldSpec> {
        const {valueSource} = this;

        throwIf(
            !valueSource && (!specs || specs.some(isString)),
            'Must provide a valueSource if fieldSpecs are not provided, or provided as strings.'
        );

        // If no specs provided, include all source fields.
        if (!specs) specs = valueSource.fieldNames;

        return specs.map(spec => {
            if (isString(spec)) spec = {field: spec};
            return new FilterChooserFieldSpec({
                source: valueSource,
                ...fieldSpecDefaults,
                ...spec
            });
        });
    }

    getFieldSpec(fieldName: string): FilterChooserFieldSpec {
        return this.fieldSpecs.find(it => it.field === fieldName);
    }

    validateFilter(f: Filter): boolean {
        if (f === null) return true;
        if (f instanceof FieldFilter) {
            if (!this.getFieldSpec(f.field)) {
                console.error(`Invalid Filter for FilterChooser: ${f.field}`);
                return false;
            }
            return true;
        }

        if (f instanceof CompoundFilter) {
            return f.filters.every(it => this.validateFilter(it));
        }

        console.error('Invalid filter for FilterChooser', f);
        return false;
    }

    getDefaultIntroHelpText(): string {
        return 'Select or enter a field name (below) or begin typing to match available field values.';
    }
}

interface FilterChooserPersistOptions extends PersistOptions {
    /** True (default) to save value to state. */
    persistValue?: boolean;

    /** True (default) to include favorites. */
    persistFavorites?: boolean;
}

/**
 * A variant of FilterLike, that excludes FunctionFilters and FilterTestFn.
 */
export type FilterChooserFilterLike =
    | Filter
    | CompoundFilterSpec
    | FieldFilterSpec
    | FilterChooserFilterLike[];
