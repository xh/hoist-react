import {lm} from '../ns.js';

lm.utils.DragListener = function( eElement, nButtonCode ) {
	lm.utils.EventEmitter.call( this );

	// Accept a jQuery wrapper (the existing call sites still pass them) or a raw Element.
	this._eElement = eElement && eElement[ 0 ] ? eElement[ 0 ] : eElement;
	this._nButtonCode = nButtonCode || 0;

	/**
	 * The delay after which to start the drag in milliseconds
	 */
	this._nDelay = 200;

	/**
	 * The distance the mouse needs to be moved to qualify as a drag
	 */
	this._nDistance = 10;//TODO - works better with delay only

	this._nX = 0;
	this._nY = 0;

	this._nOriginalX = 0;
	this._nOriginalY = 0;

	this._bDragging = false;

	this._fMove = lm.utils.fnBind( this.onMouseMove, this );
	this._fUp = lm.utils.fnBind( this.onMouseUp, this );
	this._fDown = lm.utils.fnBind( this.onMouseDown, this );

	this._abort = null; // (re)created per gesture in onMouseDown
	this._touchTarget = null;
	this._touchStart = 0;

	this._eElement.addEventListener( 'mousedown', this._fDown );
	this._eElement.addEventListener( 'touchstart', this._fDown, { passive: false } );
};

lm.utils.DragListener.timeout = null;

lm.utils.copy( lm.utils.DragListener.prototype, {
	destroy: function() {
		this._eElement.removeEventListener( 'mousedown', this._fDown );
		this._eElement.removeEventListener( 'touchstart', this._fDown );
		if( this._abort ) this._abort.abort();
		this._eElement = null;
	},

	/**
	 * Hoist patches folded in (#4336):
	 * - On `touchstart`, the original touch target is cloned in place and the
	 *   real target is moved out of the page; the WHATWG touch-events spec
	 *   notes that removing the original target cancels subsequent touchmoves,
	 *   which manifested as 2-touch drag bugs without this workaround.
	 * - The drag-start delay is much longer for touch (3000ms vs 200ms) so a
	 *   short hold can show the platform context menu.
	 */
	onMouseDown: function( oEvent ) {
		if( oEvent.cancelable ) oEvent.preventDefault();

		if( oEvent.type === 'touchstart' ) {
			this._touchTarget = oEvent.target;

			var parent = this._touchTarget.parentNode,
				idx = Array.from( parent.children ).indexOf( this._touchTarget ),
				clone = this._touchTarget.cloneNode( true );

			parent.insertBefore( clone, idx < parent.children.length - 1 ? parent.childNodes[ idx + 1 ] : null );

			document.body.appendChild( this._touchTarget );
			this._touchTarget.style.display = 'none';
		}

		if( oEvent.button == 0 || oEvent.type === 'touchstart' ) {
			var coordinates = this._getCoordinates( oEvent );

			this._nOriginalX = coordinates.x;
			this._nOriginalY = coordinates.y;

			this._abort = new AbortController();
			var signal = this._abort.signal;
			document.addEventListener( 'mousemove', this._fMove, { signal: signal } );
			// touchmove must be non-passive: onMouseMove may call preventDefault.
			document.addEventListener( 'touchmove', this._fMove, { passive: false, signal: signal } );
			document.addEventListener( 'mouseup', this._fUp, { once: true, signal: signal } );
			document.addEventListener( 'touchend', this._fUp, { once: true, signal: signal } );

			var ms = oEvent.type === 'touchstart' ? 3000 : this._nDelay;
			this._touchStart = Date.now();
			this._timeout = setTimeout( lm.utils.fnBind( this._startDrag, this ), ms );
		}
	},

	onMouseMove: function( oEvent ) {
		if( this._timeout != null ) {
			oEvent.preventDefault();

			var coordinates = this._getCoordinates( oEvent );

			this._nX = coordinates.x - this._nOriginalX;
			this._nY = coordinates.y - this._nOriginalY;

			if( this._bDragging === false ) {
				if(
					Math.abs( this._nX ) > this._nDistance ||
					Math.abs( this._nY ) > this._nDistance
				) {
					clearTimeout( this._timeout );
					this._startDrag();
				}
			}

			if( this._bDragging ) {
				this.emit( 'drag', this._nX, this._nY, oEvent );
			}
		}
	},

	/**
	 * Hoist patches folded in (#4336):
	 * - Touch-target clone is removed.
	 * - On a sufficiently-long touchend without dragging, fire `contextmenu`
	 *   so a tap-and-hold opens the GL header context menu.
	 */
	onMouseUp: function( oEvent ) {
		if( this._touchTarget ) {
			document.body.removeChild( this._touchTarget );
			this._touchTarget = null;
		}

		if( this._timeout != null ) {
			clearTimeout( this._timeout );
			document.body.classList.remove( 'lm_dragging' );
			this._eElement.classList.remove( 'lm_dragging' );
			document.querySelectorAll( 'iframe' ).forEach( function( frame ) {
				frame.style.pointerEvents = '';
			} );
			if( this._abort ) {
				this._abort.abort();
				this._abort = null;
			}

			if( this._bDragging === true ) {
				this._bDragging = false;
				this.emit( 'dragStop', oEvent, this._nOriginalX + this._nX );
			} else if( oEvent.type === 'touchend' && Date.now() - this._touchStart > 800 ) {
				this._eElement.dispatchEvent( new Event( 'contextmenu', { bubbles: true, cancelable: true } ) );
			}
		}
	},

	_startDrag: function() {
		this._bDragging = true;
		document.body.classList.add( 'lm_dragging' );
		this._eElement.classList.add( 'lm_dragging' );
		document.querySelectorAll( 'iframe' ).forEach( function( frame ) {
			frame.style.pointerEvents = 'none';
		} );
		this.emit( 'dragStart', this._nOriginalX, this._nOriginalY );
	},

	_getCoordinates: function( event ) {
		// Native touch events expose .touches directly; jQuery-wrapped events
		// proxy through .originalEvent. Both DragProxy and DragListener emit
		// the raw event we get from the DOM, so the touches branch is enough
		// for native; the originalEvent branch is harmless when we still get
		// a jQuery event from a not-yet-ported caller.
		var touches = event.touches || ( event.originalEvent && event.originalEvent.touches );
		var src = touches ? touches[ 0 ] : event;
		return {
			x: src.pageX,
			y: src.pageY
		};
	}
} );
