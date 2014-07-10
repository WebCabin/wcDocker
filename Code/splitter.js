/*
  Splits an area in two, dividing it with a resize splitter bar
*/
function wcSplitter($container, parent, isHorizontal) {
  this.$container = $container;
  this._parent = parent;
  this._horizontal = isHorizontal;

  this._pane = [false, false];
  this.$pane = [];
  this.$bar;
  this._pos = 0.4;
  this._findBestPos = false;

  this._init();
};

wcSplitter.prototype = {
  _init: function() {
    this.$pane.push($('<div class="wcLayoutPane">'));
    this.$pane.push($('<div class="wcLayoutPane">'));
    this.$bar = $('<div class="wcSplitterBar">');

    if (this._horizontal) {
      this.$pane[0].addClass('wcTall');
      this.$pane[1].addClass('wcTall');
      this.$bar.addClass('wcTall').addClass('wcSplitterBarV');
    } else {
      this.$pane[0].addClass('wcWide');
      this.$pane[1].addClass('wcWide');
      this.$bar.addClass('wcWide').addClass('wcSplitterBarH');
    }

    this.container(this.$container);
  },

  // Whether the splitter splits horizontally.
  isHorizontal: function() {
    return this._horizontal;
  },

  // Moves the slider bar based on a mouse position.
  // Params:
  //    mouse       The mouse offset position.
  moveBar: function(mouse) {
    var width = this.$container.width();
    var height = this.$container.height();
    var offset = this.$container.offset();

    mouse.x -= offset.left;
    mouse.y -= offset.top;

    var minSize = this.minPos();
    var maxSize = this.maxPos();

    if (this._horizontal) {
      this.pos((mouse.x-3) / width);
    } else {
      this.pos((mouse.y-3) / height);
    }
  },

  // Updates the size of the splitter.
  update: function() {
    var width = this.$container.width();
    var height = this.$container.height();

    var minSize = this.minPos();
    var maxSize = this.maxPos();

    if (this._findBestPos) {
      this._findBestPos = false;

      var size1;
      var size2;
      if (this._pane[0] && typeof this._pane[0].size === 'function') {
        size1 = this._pane[0].size();
      }

      if (this._pane[1] && typeof this._pane[1].size === 'function') {
        size2 = this._pane[1].size();

        if (size2) {
          size2.x = width  - size2.x;
          size2.y = height - size2.y;
        }
      }

      var size;
      if (size1 && size2) {
        size = {
          x: Math.min(size1.x, size2.x),
          y: Math.min(size1.y, size2.y),
        };
      } else if (size1) {
        size = size1;
      } else if (size2) {
        size = size2;
      }

      if (size) {
        if (this._horizontal) {
          this._pos = size.x / width;
        } else {
          this._pos = size.y / height;
        }
      }
    }

    if (this._horizontal) {
      var size = width * this._pos;

      if (minSize) {
        size = Math.max(minSize.x, size);
      }
      if (maxSize) {
        size = Math.min(maxSize.x, size);
      }

      this.$bar.css('left', size+2);
      this.$pane[0].css('width', size + 'px');
      this.$pane[0].css('left',  '0px');
      this.$pane[0].css('right', '');
      this.$pane[1].css('left',  '');
      this.$pane[1].css('right', '0px');
      this.$pane[1].css('width', width - size - 5 + 'px');
    } else {
      var size = height * this._pos;

      if (minSize) {
        size = Math.max(minSize.y, size);
      }
      if (maxSize) {
        size = Math.min(maxSize.y, size);
      }

      this.$bar.css('top', size);
      this.$pane[0].css('height', size + 'px');
      this.$pane[0].css('top',    '0px');
      this.$pane[0].css('bottom', '');
      this.$pane[1].css('top',    '');
      this.$pane[1].css('bottom', '0px');
      this.$pane[1].css('height', height - size - 5 + 'px');
    }

    this._pane[0].update();
    this._pane[1].update();
  },

  // Gets the minimum position of the splitter divider.
  minPos: function() {
    var minSize;
    if (this._pane[0] && typeof this._pane[0].minSize === 'function') {
      minSize = this._pane[0].minSize();
    }
    return minSize;
  },

  // Gets the maximum position of the splitter divider.
  maxPos: function() {
    var width = this.$container.width();
    var height = this.$container.height();

    var maxSize;
    if (this._pane[1] && typeof this._pane[1].minSize === 'function') {
      maxSize = this._pane[1].minSize();

      if (maxSize) {
        maxSize.x = width  - maxSize.x;
        maxSize.y = height - maxSize.y;
      }
    }
    return maxSize;
  },

  // Gets the minimum size of the widget.
  minSize: function() {
    var minSize1;
    var minSize2;
    if (this._pane[0] && typeof this._pane[0].minSize === 'function') {
      minSize1 = this._pane[0].minSize();
    }

    if (this._pane[1] && typeof this._pane[1].minSize === 'function') {
      minSize2 = this._pane[1].minSize();
    }

    if (minSize1 && minSize2) {
      if (this._horizontal) {
        minSize1.x += minSize2.x;
        minSize1.y = Math.max(minSize1.y, minSize2.y);
      } else {
        minSize1.y += minSize2.y;
        minSize1.x = Math.max(minSize1.x, minSize2.x);
      }
      return minSize1;
      return {
        x: Math.min(minSize1.x, minSize2.x),
        y: Math.min(minSize1.y, minSize2.y),
      };
    } else if (minSize1) {
      return minSize1;
    } else if (minSize2) {
      return minSize2;
    }

    return false;
  },

  // Get, or Set a splitter position.
  // Params:
  //    pos           If supplied, assigns a new splitter percentage (0-1).
  // Returns:
  //    number        The current position.
  pos: function(pos) {
    if (typeof pos === 'undefined') {
      return this._pos;
    }
    this._pos = pos;
    return this._pos;
  },

  findBestPos: function() {
    this._findBestPos = true;
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

    this.$pane[0].remove();
    this.$pane[1].remove();
    this.$bar.remove();
    this.$container = $container;

    if (this.$container) {
      this.$container.append(this.$pane[0]);
      this.$container.append(this.$pane[1]);
      this.$container.append(this.$bar);
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

  // Removes a child from this widget.
  // Params:
  //    child         The child to remove.
  removeChild: function(child) {
    if (this._pane[0] === child) {
      this._pane[0] = false;
    } else if (this._pane[1] === child) {
      this._pane[1] = false;
    } else {
      return;
    }
 
    if (child) {
      child.container(null);
      child.parent(null);
    }
  },

  // Sets, or Gets the widget at a given pane
  // Params:
  //    index     The pane index, only 0 or 1 are valid.
  //    item      If supplied, assigns the item to the pane.
  // Returns:
  //    widget    The widget that exists in the pane.
  //    false     If no pane exists.
  pane: function(index, item) {
    if (index >= 0 && index < 2) {
      if (typeof item === 'undefined') {
        return this._pane[index];
      } else {
        if (this._pane[index]) {
          this._pane[index].container(null);
          this._pane[index] = false;
        }

        if (item) {
          this._pane[index] = item;
          item.parent(this);
          item.container(this.$pane[index]);
        }
      }
    }
    return false;
  },

  // Disconnects and prepares this widget for destruction.
  destroy: function() {
    if (this._pane[0]) {
      this._pane[0].container(null);
    }
    if (this._pane[1]) {
      this._pane[1].container(null);
    }

    this.container(null);
    this.parent(null);
  },
};