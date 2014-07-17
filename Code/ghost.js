/*
  A ghost object that follows the mouse around during dock movement.
*/
function wcGhost(rect, mouse) {
  this.$ghost = null;
  this._rect;
  this._anchorMouse = false;
  this._anchor = null;

  this.__init(rect, mouse);
};

wcGhost.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Change the ghost's anchor.
  // Params:
  //    mouse     The current mouse position.
  //    rect      If supplied, will change to this size,
  //              otherwise will revert to default size.
  anchor: function(mouse, anchor) {
    if (typeof mouse === 'undefined') {
      return this._anchor;
    }

    if (anchor && this._anchor && anchor.loc === this._anchor.loc && anchor.item === this._anchor.item) {
      return;
    }

    var rect = {
      x: parseInt(this.$ghost.css('left')),
      y: parseInt(this.$ghost.css('top')),
      w: parseInt(this.$ghost.css('width')),
      h: parseInt(this.$ghost.css('height')),
    };

    this._anchorMouse = {
      x: rect.x - mouse.x,
      y: rect.y - mouse.y,
    };

    this._rect.x = -this._anchorMouse.x;
    this._rect.y = -this._anchorMouse.y;

    if (!anchor) {
      if (!this._anchor) {
        return;
      }

      this._anchor = null;
      this.$ghost.show();
      this.$ghost.stop().animate({
        opacity: 0.3,
        'margin-left': this._rect.x - this._rect.w/2 + 'px',
        'margin-top': this._rect.y - 10 + 'px',
        width: this._rect.w + 'px',
        height: this._rect.h + 'px',
      }, 200);
      return;
    }

    this._anchor = anchor;
    var opacity = 0.8;
    if (anchor.self && anchor.merge) {
      opacity = 0;
      this.$ghost.hide();
    } else {
      this.$ghost.show();
    }
    this.$ghost.stop().animate({
      opacity: opacity,
      'margin-left': '2px',
      'margin-top': '2px',
      border: '0px',
      left: anchor.x + 'px',
      top: anchor.y + 'px',
      width: anchor.w + 'px',
      height: anchor.h + 'px',
    }, 200);
  },

///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Initialize
  __init: function(rect, mouse) {
    this.$ghost = $('<div class="wcGhost">')
      .css('opacity', 0)
      .css('top', rect.y + 'px')
      .css('left', rect.x + 'px')
      .css('width', rect.w + 'px')
      .css('height', rect.h + 'px');

    this._anchorMouse = {
      x: rect.x - mouse.x,
      y: rect.y - mouse.y,
    };

    this._rect = {
      x: -this._anchorMouse.x,
      y: -this._anchorMouse.y,
      w: rect.w,
      h: rect.h,
    };

    this.anchor(mouse, rect);

    $('body').append(this.$ghost);
  },

  // Gets the original size of the moving widget.
  __rect: function() {
    return this._rect;
  },

  // Updates the size of the layout.
  __move: function(mouse) {
    if (this._anchor) {
      return;
    }

    var x = parseInt(this.$ghost.css('left'));
    var y = parseInt(this.$ghost.css('top'));

    x = mouse.x + this._anchorMouse.x;
    y = mouse.y + this._anchorMouse.y;

    this.$ghost.css('left', x + 'px');
    this.$ghost.css('top',  y + 'px');
  },

  // Exorcise the ghost.
  __destroy: function() {
    this.$ghost.stop().animate({
      opacity: 0.0,
    }, {
      duration: 250,
      complete: function() {
        $(this).remove();
      },
    });
  },
};