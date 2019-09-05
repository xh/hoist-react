import {useContext, useState} from 'react';
import {ModelLookup, ModelLookupContext, modelLookupContextProvider} from './ModelLookup';

/**
 * @private
 *
 * Wrap an element in an element that established a model context.
 *
 * Null op, if model is null.
 */
export function useModelContextWrapper(model, element) {
    const parent = useContext(ModelLookupContext),
        [lookup] = useState(() => model ? new ModelLookup(model, parent) : null);

    return lookup ? modelLookupContextProvider({value: lookup, item: element}) : element;
}