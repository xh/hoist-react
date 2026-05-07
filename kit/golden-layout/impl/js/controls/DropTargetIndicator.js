import {lm} from '../ns.js';

lm.controls.DropTargetIndicator = function() {
	this.element = document.createElement( 'div' );
	this.element.className = 'lm_dropTargetIndicator';
	var inner = document.createElement( 'div' );
	inner.className = 'lm_inner';
	this.element.appendChild( inner );
	this.element.style.display = 'none';
	document.body.appendChild( this.element );
};

lm.utils.copy( lm.controls.DropTargetIndicator.prototype, {
	destroy: function() {
		this.element.remove();
	},

	highlight: function( x1, y1, x2, y2 ) {
		this.highlightArea( { x1: x1, y1: y1, x2: x2, y2: y2 } );
	},

	highlightArea: function( area ) {
		var s = this.element.style;
		s.left = area.x1 + 'px';
		s.top = area.y1 + 'px';
		s.width = ( area.x2 - area.x1 ) + 'px';
		s.height = ( area.y2 - area.y1 ) + 'px';
		s.display = '';
	},

	hide: function() {
		this.element.style.display = 'none';
	}
} );