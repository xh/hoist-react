import {lm} from '../ns.js';

lm.controls.TransitionIndicator = function() {
	this._element = document.createElement( 'div' );
	this._element.className = 'lm_transition_indicator';
	this._element.style.display = 'none';
	document.body.appendChild( this._element );
};

lm.utils.copy( lm.controls.TransitionIndicator.prototype, {
	destroy: function() {
		this._element.remove();
	},

	// Body intentionally a no-op: the upstream animation was disabled long
	// before the fork (`return;` at the top with a "TODO - not quite as cool
	// as expected" comment). All callers go through this method, so the
	// indicator never appears. Kept as a stub to preserve the public API.
	transitionElements: function( /* fromElement, toElement */ ) {}
} );