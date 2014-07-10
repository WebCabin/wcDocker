function wcFrameWidget($container, parent, isFloating) {
  this.$container = $container;
  this._parent = parent;
  this._isFloating = isFloating;

  this.$frame   = null;
  this.$title   = null;
  this.$center  = null;
  this.$close   = null;
  this.$dock    = null;
  this.$top     = null;
  this.$bottom  = null;
  this.$left    = null;
  this.$right   = null;
  this.$corner1 = null;
  this.$corner2 = null;
  this.$corner3 = null;
  this.$corner4 = null;

  this.$tabList = [];

  this._curTab = -1;
  this._widgetList = [];

  this._pos = {
    x: 700,
    y: 400,
  };

  this._size = {
    x: 400,
    y: 400,
  };

  this._anchorMouse = {
    x: 0,
    y: 0,
  };

  this._init();
};

wcFrameWidget.prototype = {
  _init: function() {
    this.$frame   = $('<div class="wcFrameWidget wcWide wcTall">');
    this.$title   = $('<div class="wcFrameTitle">');
    this.$center  = $('<div class="wcFrameCenter wcWide">');
    this.$close   = $('<div class="wcFrameCloseButton">X</div>');
    this.$frame.append(this.$title);
    this.$frame.append(this.$close);

    if (this._isFloating) {
      this.$dock    = $('<div class="wcFrameDockButton"></div>');
      this.$top     = $('<div class="wcFrameEdgeH wcFrameEdge"></div>').css('top', '-6px').css('left', '0px').css('right', '0px');
      this.$bottom  = $('<div class="wcFrameEdgeH wcFrameEdge"></div>').css('bottom', '-6px').css('left', '0px').css('right', '0px');
      this.$left    = $('<div class="wcFrameEdgeV wcFrameEdge"></div>').css('left', '-6px').css('top', '0px').css('bottom', '0px');
      this.$right   = $('<div class="wcFrameEdgeV wcFrameEdge"></div>').css('right', '-6px').css('top', '0px').css('bottom', '0px');
      this.$corner1 = $('<div class="wcFrameCornerNW wcFrameEdge"></div>').css('top', '-6px').css('left', '-6px');
      this.$corner2 = $('<div class="wcFrameCornerNE wcFrameEdge"></div>').css('top', '-6px').css('right', '-6px');
      this.$corner3 = $('<div class="wcFrameCornerNW wcFrameEdge"></div>').css('bottom', '-6px').css('right', '-6px');
      this.$corner4 = $('<div class="wcFrameCornerNE wcFrameEdge"></div>').css('bottom', '-6px').css('left', '-6px');

      this.$frame.append(this.$dock);
      this.$frame.append(this.$top);
      this.$frame.append(this.$bottom);
      this.$frame.append(this.$left);
      this.$frame.append(this.$right);
      this.$frame.append(this.$corner1);
      this.$frame.append(this.$corner2);
      this.$frame.append(this.$corner3);
      this.$frame.append(this.$corner4);
    }

    this.$frame.append(this.$center);

    // Floating windows have no container.
    this.container(this.$container);

    if (this._isFloating) {
      this.$frame.addClass('wcFloating');
    }
  },

  // Updates the size of the frame.
  update: function() {
    // Floating windows manage their own sizing.
    if (this._isFloating) {
      this.$frame.css('left', this._pos.x + 'px');
      this.$frame.css('top', this._pos.y + 'px');
      this.$frame.css('width', this._size.x + 'px');
      this.$frame.css('height', this._size.y + 'px');
    }

    if (this._curTab > -1 && this._curTab < this._widgetList.length) {
      this._widgetList[this._curTab].update();
    }
  },

  // Gets the desired size of the widget.
  size: function() {
    var size = {
      x: -1,
      y: -1,
    };

    for (var i = 0; i < this._widgetList.length; ++i) {
      if (size.x < this._widgetList[i].size().x) {
        size.x = this._widgetList[i].size().x;
      }
      if (size.y < this._widgetList[i].size().y) {
        size.y = this._widgetList[i].size().y;
      }
    }
    return size;
  },

  // Gets the minimum size of the widget.
  minSize: function() {
    var size = {
      x: -1,
      y: -1,
    };

    for (var i = 0; i < this._widgetList.length; ++i) {
      if (size.x === -1 || size.x > this._widgetList[i].minSize().x) {
        size.x = this._widgetList[i].minSize().x;
      }
      if (size.y === -1 || size.y > this._widgetList[i].minSize().y) {
        size.y = this._widgetList[i].minSize().y;
      }
    }
    return size;
  },

  // Adds a given widget as a new tab item.
  // Params:
  //    widget    The widget to add.
  //    index     An optional index to insert the tab at.
  addWidget: function(widget, index) {
    var found = this._widgetList.indexOf(widget);
    if (found !== -1) {
      this._widgetList.splice(found, 1);
    }

    if (typeof index === 'undefined') {
      this._widgetList.push(widget);
    } else {
      this._widgetList.splice(index, 0, widget);
      if (this._curTab >= index) {
        this._curTab++;
      }
    }

    if (this._curTab === -1 && this._widgetList.length) {
      this._curTab = 0;
      this._widgetList[this._curTab].layout().container(this.$center);
      this._widgetList[this._curTab].container(this.$center);
      this.$title.text(this._widgetList[this._curTab].title());
    }
    this._widgetList[this._curTab].parent(this);

    this._size = this.size();
  },

  // Remvoes a given widget from the tab item.
  // Params:
  //    widget      The widget to remove.
  removeWidget: function(widget) {
    for (var i = 0; i < this._widgetList.length; ++i) {
      if (this._widgetList[i] === widget) {
        if (this._curTab === i) {
          this._curTab--;
        }

        this._widgetList[i].layout().container(null);
        this._widgetList[i].container(null);
        this._widgetList[i].parent(null);

        this._widgetList.splice(i, 1);
        break;
      }
    }

    if (this._curTab === -1 && this._widgetList.length) {
      this._curTab = 0;
      this._widgetList[this._curTab].layout().container(this.$center);
      this._widgetList[this._curTab].container(this.$center);
    }
  },

  widget: function() {
    if (this._widgetList.length) {
      return this._widgetList[0];
    }
    return false;
  },

  // Sets the anchor position for moving the widget.
  // Params:
  //    mouse     The current mouse position.
  anchorMove: function(mouse) {
    this._anchorMouse.x = this._pos.x - mouse.x;
    this._anchorMouse.y = this._pos.y - mouse.y;
  },

  // Checks if the mouse is in a valid anchor position for docking a widget.
  // Params:
  //    mouse     The current mouse position.
  //    same      Whether the moving frame and this one are the same.
  checkAnchorDrop: function(mouse, same) {
    var width = this.$frame.width();
    var height = this.$frame.height();
    var offset = this.$frame.offset();

    if (same) {
      // Entire frame.
      if (mouse.y >= offset.top && mouse.y <= offset.top + height &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        return {
          x: offset.left,
          y: offset.top,
          w: width,
          h: height,
          loc: wcDocker.DOCK_FLOAT,
          frame: this,
        };
      }
    }

    if (this._isFloating) {
      return false;
    }

    // Bottom side docking.
    if (mouse.y >= offset.top + height*0.75 && mouse.y <= offset.top + height &&
        mouse.x >= offset.left && mouse.x <= offset.left + width) {
      return {
        x: offset.left,
        y: offset.top + (height - height*0.4),
        w: width,
        h: height*0.4,
        loc: wcDocker.DOCK_BOTTOM,
        frame: this,
      };
    }

    // Left side docking
    if (mouse.y >= offset.top && mouse.y <= offset.top + height) {
      if (mouse.x >= offset.left && mouse.x <= offset.left + width*0.25) {
        return {
          x: offset.left,
          y: offset.top,
          w: width*0.4,
          h: height,
          loc: wcDocker.DOCK_LEFT,
          frame: this,
        };
      }

      // Right side docking
      if (mouse.x >= offset.left + width*0.75 && mouse.x <= offset.left + width) {
        return {
          x: offset.left + width*0.6,
          y: offset.top,
          w: width*0.4,
          h: height,
          loc: wcDocker.DOCK_RIGHT,
          frame: this,
        };
      }
    }
  },

  // Moves the widget based on mouse dragging.
  // Params:
  //    mouse     The current mouse position.
  move: function(mouse) {
    this._pos.x = mouse.x + this._anchorMouse.x;
    this._pos.y = mouse.y + this._anchorMouse.y;
  },

  // Resizes the widget based on mouse dragging.
  // Params:
  //    edges     A list of edges being moved.
  //    mouse     The current mouse position.
  resize: function(edges, mouse) {
    var width = this.$container.width();
    var height = this.$container.height();
    var offset = this.$container.offset();

    mouse.x -= offset.left;
    mouse.y -= offset.top;

    var minSize = this.minSize();

    for (var i = 0; i < edges.length; ++i) {

      switch (edges[i]) {
        case 'top':
          this._size.y += this._pos.y - mouse.y;
          this._pos.y = mouse.y;
          if (this._size.y < minSize.y) {
            this._pos.y += this._size.y - minSize.y;
            this._size.y = minSize.y;
          }
          break;
        case 'bottom':
          this._size.y = mouse.y - this._pos.y;
          if (this._size.y < minSize.y) {
            this._size.y = minSize.y;
          }
          break;
        case 'left':
          this._size.x += this._pos.x - mouse.x;
          this._pos.x = mouse.x;
          if (this._size.x < minSize.x) {
            this._pos.x += this._size.x - minSize.x;
            this._size.x = minSize.x;
          }
          break;
        case 'right':
          this._size.x = mouse.x - this._pos.x;
          if (this._size.x < minSize.x) {
            this._size.x = minSize.x;
          }
          break;
      }
    }
  },

  // Turn off or on a shadowing effect to signify this widget is being moved.
  // Params:
  //    enabled       Whether to enable shadow mode.
  shadow: function(enabled) {
    if (enabled) {
      this.$frame.stop().animate({
        opacity: 0.3,
      }, 300);
    } else {
      this.$frame.stop().animate({
        opacity: 1.0,
      }, 300);
    }
  },

  // Retrieves the bounding rect for this frame.
  rect: function() {
    var offset = this.$frame.offset();
    var width = this.$frame.width();
    var height = this.$frame.height();

    return {
      x: offset.left,
      y: offset.top,
      w: width,
      h: height,
    };
  },

  // Gets, or Sets a new container for this layout.
  // Params:
  //    $container          If supplied, sets a new container for this layout.
  //    parent              If supplied, sets a new parent for this layout.
  // Returns:
  //    JQuery collection   The current container.
  container: function($container) {
    if (typeof $container === 'undefined') {
      return this.$container;
    }

    this.$frame.remove();
    this.$container = $container;
    if (this.$container) {
      this.$container.append(this.$frame);
    }
    return this.$container;
  },

  // Gets, or Sets the parent item for this layout.
  // Params:
  //    parent        If supplied, sets a new parent for this layout.
  // Returns:
  //    object        The current parent.
  parent: function(parent) {
    if (typeof parent === 'undefined') {
      return this._parent;
    }

    this._parent = parent;
    return this._parent;
  },

  // Disconnects and prepares this widget for destruction.
  destroy: function() {
    this._curTab = -1;
    for (var i = 0; i < this._widgetList.length; ++i) {
      this._widgetList[i].layout().container(null);
      this._widgetList[i].container(null);
      this._widgetList[i].parent(null);
    }

    this._widgetList = [];
    this.container(null);
    this.parent(null);
  },
};