import {lm} from '../ns.js';
import React from 'react';
import {createRoot} from 'react-dom/client';

/**
 * A specialised GoldenLayout component that binds GoldenLayout container
 * lifecycle events to React components.
 *
 * Hoist patches folded in (#4336):
 *  - The legacy ReactDOM.render / unmountComponentAtNode API is replaced with
 *    React 18's createRoot.render / root.unmount, so the handler works with
 *    functional components.
 *  - _getReactComponent passes viewModelId / icon / title / state through to
 *    the underlying component so DashContainerView instances can be wired to
 *    DashViewModels by id and re-hydrated from saved state.
 *
 * @constructor
 *
 * @param {lm.container.ItemContainer} container
 * @param {Object} state state is not required for react components
 */
lm.utils.ReactComponentHandler = function( container, state ) {
	this._reactComponent = null;
	this._root = null;
	this._container = container;
	this._initialState = state;
	this._reactClass = this._getReactClass();
	this._container.on( 'open', this._render, this );
	this._container.on( 'destroy', this._destroy, this );
};

lm.utils.copy( lm.utils.ReactComponentHandler.prototype, {

	/**
	 * Creates the React component and mounts it into the container's element.
	 *
	 * @private
	 * @returns {void}
	 */
	_render: function() {
		this._reactComponent = this._getReactComponent();
		if( !this._root ) this._root = createRoot( this._container.getElement() );
		this._root.render( this._reactComponent );
	},

	/**
	 * Unmounts the React root, cleaning up after the component.
	 *
	 * @private
	 * @returns {void}
	 */
	_destroy: function() {
		this._root.unmount();
		this._container.off( 'open', this._render, this );
		this._container.off( 'destroy', this._destroy, this );
	},

	/**
	 * Retrieves the react class from GoldenLayout's registry.
	 *
	 * @private
	 * @returns {React.Class}
	 */
	_getReactClass: function() {
		var componentName = this._container._config.component;
		var reactClass;

		if( !componentName ) {
			throw new Error( 'No react component name. type: react-component needs a field `component`' );
		}

		reactClass = this._container.layoutManager.getComponent( componentName );

		if( !reactClass ) {
			throw new Error( 'React component "' + componentName + '" not found. ' +
				'Please register all components with GoldenLayout using `registerComponent(name, component)`' );
		}

		return reactClass;
	},

	/**
	 * Builds the props for the React component, exposing GL container/event-hub
	 * plus the Hoist-specific keys (viewModelId, icon, title, viewState) that
	 * DashContainerView relies on to look up its DashViewModel.
	 *
	 * @private
	 * @returns {React.Element}
	 */
	_getReactComponent: function() {
		var cfg = this._container._config;
		var props = {
			viewModelId: cfg.viewModelId,
			icon: cfg.icon,
			title: cfg.title,
			viewState: cfg.state,
			glEventHub: this._container.layoutManager.eventHub,
			glContainer: this._container
		};
		return React.createElement( this._reactClass, props );
	}
} );
