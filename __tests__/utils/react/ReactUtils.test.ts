import React from 'react';
import {getReactElementName, elementFromContent} from '@xh/hoist/utils/react/ReactUtils';

describe('getReactElementName', () => {
    it('returns the component name from type.name', () => {
        function MyComponent() {
            return null;
        }
        const el = React.createElement(MyComponent);
        expect(getReactElementName(el)).toBe('MyComponent');
    });

    it('falls back to type.displayName when name is absent', () => {
        const AnonComp: React.FC = () => null;
        // Arrow functions inherit the variable name; clear it so displayName is the fallback.
        Object.defineProperty(AnonComp, 'name', {value: ''});
        (AnonComp as any).displayName = 'MyDisplayName';
        const el = React.createElement(AnonComp);
        expect(getReactElementName(el)).toBe('MyDisplayName');
    });
});

describe('elementFromContent', () => {
    it('returns null for null input', () => {
        expect(elementFromContent(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
        expect(elementFromContent(undefined)).toBeNull();
    });

    it('calls an element factory with addProps and returns the result', () => {
        const factory: any = jest.fn(props => React.createElement('div', props));
        factory.isElementFactory = true;
        const result = elementFromContent(factory, {id: 'from-factory'});
        expect(factory).toHaveBeenCalledWith({id: 'from-factory'});
        expect(React.isValidElement(result)).toBe(true);
    });

    it('creates an element from a HoistComponent via createElement', () => {
        function MyComp() {
            return null;
        }
        (MyComp as any).isHoistComponent = true;
        const result = elementFromContent(MyComp as any, {id: 'x'});
        expect(React.isValidElement(result)).toBe(true);
        expect((result as React.ReactElement).type).toBe(MyComp);
    });

    it('returns an existing React element directly when no addProps provided', () => {
        const el = React.createElement('span', null, 'hello');
        expect(elementFromContent(el as any)).toBe(el);
    });

    it('clones an existing React element and applies addProps', () => {
        const el = React.createElement('div', {id: 'orig', className: 'base'});
        const result = elementFromContent(el as any, {id: 'override'}) as React.ReactElement;
        expect(result.props.id).toBe('override');
        expect(result.props.className).toBe('base'); // untouched prop preserved
    });

    it('calls a plain function and returns its React element result', () => {
        const fn = () => React.createElement('p', null, 'content');
        const result = elementFromContent(fn as any);
        expect(React.isValidElement(result)).toBe(true);
    });

    it('throws when a plain function returns a non-element', () => {
        expect(() => elementFromContent((() => 'not-an-element') as any)).toThrow();
    });
});
