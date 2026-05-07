import {lm} from '../ns.js';
import $ from 'jquery';

lm.controls.HeaderButton = function( header, label, cssClass, action ) {
	this._header = header;
	this._action = action;
	this._abort = new AbortController();

	var node = document.createElement( 'li' );
	node.className = cssClass;
	node.title = label;

	// Wrap so Header (still jQuery) can drive button.element.hide()/show()/etc.
	this.element = $( node );

	this._header.on( 'destroy', this._$destroy, this );

	var signal = this._abort.signal;
	node.addEventListener( 'click', action, { signal: signal } );
	node.addEventListener( 'touchstart', action, { signal: signal } );

	this._header.controlsContainer.append( this.element );
};

lm.utils.copy( lm.controls.HeaderButton.prototype, {
	_$destroy: function() {
		this._abort.abort();
		this.element.remove();
	}
} );