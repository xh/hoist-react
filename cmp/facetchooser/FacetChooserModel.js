/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from '@xh/hoist/core';
import {fmtNumber, fmtDate} from '@xh/hoist/format';
import {action, bindable, computed} from '@xh/hoist/mobx';
import {ValueFilter} from '@xh/hoist/data/cube/filter/ValueFilter';
import {throwIf} from '@xh/hoist/utils/js';
import {isEmpty, sortBy} from 'lodash';

/**
 *  A select based component for allowing quick search-as-you type selection of facets and values for filtering.
 *
 *  Derives its results from a Cube, by providing `cube` and optional `dimensions[]`. Alternatively, users can
 *  set `facetSpecs[]` directly. Results can be optionally truncated by providing a `limit` prop.
 *
 *  Selected facets are exposed as both observable `value`, and computed `valueFilters` ready for use in Cube filtering.
 *
 *  Special consideration is given to filtering and sorting to make it as fast to find desired values as possible.
 *  Users can input a full or partial query for either a value or a facet, or a combination of the two.
 *  E.g. when looking for the country Japan, you could type:
 *      + "ja" - partial match on value
 *      + "japan" - exact match on value - boosted to top
 *      + "country:j" - match only countries starting with j
 *      + "c:j" - partial match on both - facets starting with c with values starting with j
 */
@HoistModel
export class FacetChooserModel {

    @bindable value;
    @bindable cube;
    @bindable.ref facetSpecs = [];

    // Immutable properties
    dimensions = [];
    limit;

    /**
     * @param c - FacetChooserModel configuration.
     * @param {Cube} [c.cube] - Cube to source FacetSpecs. Must provide either this or `facetSpecs`.
     * @param {FacetSpec[]} [c.facetSpecs] - Provided array of FacetSpecs. Must provide either this or `cube`.
     * @param {string[]} [c.dimensions] - cube dimensions available for selection. If not provided,
     *      all cube leaf dimensions will be available. Ignored if `cube` is not provided.
     * @param {number} [c.limit] - maximum number of results to show before truncating.
     */
    constructor({
        cube,
        facetSpecs = [],
        dimensions = [],
        limit
    }) {
        throwIf(!cube || isEmpty(facetSpecs), 'Must provide either `cube` or `facetSpecs`');

        this.cube = cube;
        this.facetSpecs = facetSpecs;
        this.dimensions = dimensions;
        this.limit = limit;

        this.addReaction({
            track: () => this.cube,
            run: () => this.onCubeChange(),
            fireImmediately: true
        });

        this.addReaction({
            track: () => this.cubeView?.result,
            run: () => this.setFacetsFromCubeView()
        });
    }

    /**
     * Selected facets as ValueFilters, ready for use with Cube
     * @returns {ValueFilter[]}
     */
    @computed
    get valueFilters() {
        return this.value?.map(it => {
            const [fieldName, value] = it.split(':');
            return new ValueFilter(fieldName, value);
        });
    }

    /**
     * Convenience method for setting value from an array of Cube ValueFilters.
     * @param {ValueFilter[]} valueFilters
     */
    setValueFilters(valueFilters) {
        const value = valueFilters?.map(it => `${it.fieldName}:${it.values[0]}`) ?? [];
        this.setValue(value);
    }

    //--------------------
    // Cube
    //--------------------
    onCubeChange() {
        if (!this.cube) return;

        XH.safeDestroy(this.cubeView);
        this.cubeView = this.cube.createView({
            query: {includeLeaves: true},
            connect: true
        });
    }

    @action
    setFacetsFromCubeView() {
        const dimVals = this.cubeView.getDimensionValues(),
            {dimensions} = this,
            facetSpecs = [];

        dimVals.forEach(dimVal => {
            const {name, label: displayName} = dimVal.field;
            if (isEmpty(dimensions) || dimensions.includes(name)) {
                dimVal.values.forEach(value => {
                    // Todo: How should we handle rendering other data types?
                    let displayValue = value;
                    if (value.isLocalDate) displayValue = fmtDate(value);

                    facetSpecs.push({value, name, displayName, displayValue});
                });
            }
        });

        this.facetSpecs = facetSpecs;
    }

    filtersToFacets(filters) {
        return filters?.map(it => `${it.fieldName}:${it.values[0]}`) ?? [];
    }

    facetsToFilters(facets) {
        return facets?.map(it => {
            const [fieldName, value] = it.split(':');
            return new ValueFilter(fieldName, value);
        });
    }

    //--------------------
    // Querying
    //--------------------
    get options() {
        return this.facetSpecs.map(f => {
            const displayName = f.displayName || f.name,
                displayValue = f.displayValue || f.value;

            return {
                ...f,
                displayName: displayName,
                displayValue: displayValue,
                value: f.name + ':' + f.value,
                label: displayName + ': ' + displayValue
            };
        });
    }

    async queryAsync(query) {
        const {limit} = this,
            results = this.sortByQuery(this.filterByQuery(query), query);

        if (limit > 0 && results.length > limit) {
            const truncateCount = results.length - limit;
            return [
                ...results.slice(0, limit),
                {value: 'TRUNCATED-MESSAGE', displayValue: `${fmtNumber(truncateCount)} results truncated`}
            ];
        }

        return results;
    }

    filterByQuery(query) {
        const {options} = this,
            sep = ':';

        if (!query || !query.length) return [];

        // Handle space after : separator
        query = query.replace(sep + ' ', sep);
        const sepIdx = query.indexOf(sep);

        if (sepIdx > -1) {
            // Matching for advanced usage where type:value is specified, with partial matching for either side.
            const facetStr = query.substr(0, sepIdx),
                facetRe = facetStr ? new RegExp('\\b' + facetStr, 'i') : null,
                valStr = query.substr(sepIdx + 1),
                valRe = valStr ? new RegExp('\\b' + valStr, 'i') : null;

            return options.filter(f => {
                const {displayName, value} = f;
                return (
                    (!facetRe || facetRe.test(displayName)) &&
                    (!valRe || valRe.test(value))
                );
            });
        } else {
            // Separator not used - match against both name and value to catch both possibilities
            const regex = new RegExp('\\b' + query, 'i');
            return options.filter(f => {
                const {displayName, value} = f;
                return regex.test(displayName + sep + value);
            });
        }
    }

    sortByQuery(options, query) {
        if (!query) return sortBy(options, it => it.value);

        const sortQuery = query.replace(/:$/, ''),
            sortRe = new RegExp('^' + sortQuery, 'i'),
            queryLength = sortQuery.length;

        return sortBy(options, it => {
            const {value, displayName} = it;

            let sorter;
            if (sortRe.test(value)) {
                sorter = queryLength === value.length ? 1 : 2;
            } else if (sortRe.test(displayName)) {
                sorter = queryLength === value.length ? 3 : 4;
            } else {
                sorter = 5;
            }

            return `${sorter}-${displayName}-${value}`;
        });
    }
}

/**
 * @typedef FacetSpec
 * @property {string} name - Name of facet type / dimension (e.g. 'COUNTRY')
 * @property {string} value - Facet value (e.g. 'Japan')
 * @property {string} [displayName] - Name suitable for display to user, defaults to name (e.g. 'Country')
 * @property {string} [displayValue] - Value suitable for display to user, defaults to value
 * @property {number} [count]- Number of records in current resultset with that value (if computable)
 */