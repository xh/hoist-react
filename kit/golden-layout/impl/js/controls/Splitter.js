import {lm} from '../ns.js';
import $ from 'jquery';

lm.controls.Splitter = function( isVertical, size, grabSize ) {
	this._isVertical = isVertical;
	this._size = size;
	this._grabSize = grabSize < size ? size : grabSize;

	this.element = this._createElement();
	this._dragListener = new lm.utils.DragListener( this.element );
};

lm.utils.copy( lm.controls.Splitter.prototype, {
	on: function( event, callback, context ) {
		this._dragListener.on( event, callback, context );
	},

	_$destroy: function() {
		this.element.remove();
	},

	_createElement: function() {
		var dragHandle = document.createElement( 'div' );
		dragHandle.className = 'lm_drag_handle';
		var element = document.createElement( 'div' );
		element.className = 'lm_splitter';
		element.appendChild( dragHandle );

		var handleExcessSize = this._grabSize - this._size;
		var handleExcessPos = handleExcessSize / 2;

		if( this._isVertical ) {
			dragHandle.style.top = -handleExcessPos + 'px';
			dragHandle.style.height = ( this._size + handleExcessSize ) + 'px';
			element.classList.add( 'lm_vertical' );
			element.style.height = this._size + 'px';
		} else {
			dragHandle.style.left = -handleExcessPos + 'px';
			dragHandle.style.width = ( this._size + handleExcessSize ) + 'px';
			element.classList.add( 'lm_horizontal' );
			element.style.width = this._size + 'px';
		}

		// Wrap so RowOrColumn (still jQuery) can drive splitter.element.css(...).
		return $( element );
	}
} );
