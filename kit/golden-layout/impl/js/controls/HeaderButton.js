import {lm} from '../ns.js';

lm.controls.HeaderButton = function( header, label, cssClass, action ) {
	this._header = header;
	this._action = action;
	this._abort = new AbortController();

	this.element = document.createElement( 'li' );
	this.element.className = cssClass;
	this.element.title = label;

	this._header.on( 'destroy', this._$destroy, this );

	var signal = this._abort.signal;
	this.element.addEventListener( 'click', action, { signal: signal } );
	this.element.addEventListener( 'touchstart', action, { signal: signal } );

	this._header.controlsContainer.appendChild( this.element );
};

lm.utils.copy( lm.controls.HeaderButton.prototype, {
	_$destroy: function() {
		this._abort.abort();
		this.element.remove();
	}
} );