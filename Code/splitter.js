/*
  Splits an area in two, dividing it with a resize splitter bar
*/
function wcSplitter($container, parent, isHorizontal) {
  this.$container = $container;
  this._parent = parent;
  this._horizontal = isHorizontal;

  this._pane = [false, false];
  this.$pane = [];
  this._pos = -1;

  this._init();
};

wcSplitter.prototype = {
  _init: function() {
    this.$pane.push($('<div class="wcLayoutPane">'));
    this.$pane.push($('<div class="wcLayoutPane">'));

    if (this._horizontal) {
      this.$pane[0].addClass('wcTall');
      this.$pane[1].addClass('wcTall');
    } else {
      this.$pane[0].addClass('wcWide');
      this.$pane[1].addClass('wcWide');
    }

    this.container(this.$container);
  },

  // Whether the splitter splits horizontally.
  isHorizontal: function() {
    return this._horizontal;
  },

  // Updates the size of the splitter.
  update: function() {
    var width = this.$container.width();
    var height = this.$container.height();

    var pane = -1;
    if (this._pane[1] && typeof this._pane[1].size === 'function') {
      var size = this._pane[1].size();
      pane = 1;
    }

    if (!size && this._pane[0] && typeof this._pane[0].size === 'function') {
      var size = this._pane[0].size();
      pane = 0;
    }

    if (pane > -1 && size) {
      if (this._horizontal) {
        if (this._pos > -1) {
          size.x = width * this._pos;
        }

        if (typeof this._pane[0].minSize === 'function') {
          var minSize = this._pane[0].minSize();
          if (minSize) {
            size.x = Math.max(minSize.x, size.x);
          }
          var maxSize = this._pane[0].maxSize();
          if (maxSize) {
            size.x = Math.min(maxSize.x, size.x);
          }
        }
        if (typeof this._pane[1].minSize === 'function') {
          var minSize = this._pane[1].minSize();
          if (minSize) {
            size.x = Math.max(minSize.x, size.x);
          }
          var maxSize = this._pane[1].maxSize();
          if (maxSize) {
            size.x = Math.min(maxSize.x, size.x);
          }
        }

        this.$pane[pane].css('width', size.x + 'px');
        if (pane === 0) {
          this.$pane[0].css('left',  '0px');
          this.$pane[0].css('right', '');
          this.$pane[1].css('left',  '');
          this.$pane[1].css('right', '0px');
          this.$pane[1].css('width', width - size.x - 5 + 'px');
        } else {
          this.$pane[1].css('left',  '');
          this.$pane[1].css('right', '0px');
          this.$pane[0].css('left',  '0px');
          this.$pane[0].css('right', '');
          this.$pane[0].css('width', width - size.x - 5 + 'px');
        }
      } else {
        if (this._pos > -1) {
          size.y = height * this._pos;
        }

        if (typeof this._pane[0].minSize === 'function') {
          var minSize = this._pane[0].minSize();
          if (minSize) {
            size.y = Math.max(minSize.y, size.y);
          }
          var maxSize = this._pane[0].maxSize();
          if (maxSize) {
            size.y = Math.min(maxSize.y, size.y);
          }
        }
        if (typeof this._pane[1].minSize === 'function') {
          var minSize = this._pane[1].minSize();
          if (minSize) {
            size.y = Math.max(minSize.y, size.y);
          }
          var maxSize = this._pane[1].maxSize();
          if (maxSize) {
            size.y = Math.min(maxSize.y, size.y);
          }
        }

        this.$pane[pane].css('height', size.y + 'px');
        if (pane === 0) {
          this.$pane[0].css('top',    '0px');
          this.$pane[0].css('bottom', '');
          this.$pane[1].css('top',    '');
          this.$pane[1].css('bottom', '0px');
          this.$pane[1].css('height', height - size.y - 5 + 'px');
        } else {
          this.$pane[1].css('top',    '');
          this.$pane[1].css('bottom', '0px');
          this.$pane[0].css('top',    '0px');
          this.$pane[0].css('bottom', '');
          this.$pane[0].css('height', height - size.y - 5 + 'px');
        }
      }
    }

    this._pane[0].update();
    this._pane[1].update();
  },

  // Gets the desired size of the widget.
  size: function() {
    // Splitters will only enforce a size if both panes contain a frame
    if (this._pane[0] && this._pane[0] instanceof wcFrameWidget &&
        this._pane[1] && this._pane[1] instanceof wcFrameWidget) {
      var size = this._pane[1].size();
      if (!size) {
        size = this._pane[0].size();
      } else if (this._pane[0].size()) {
        size.x = Math.max(this._pane[0].size().x, size.x);
        size.y = Math.max(this._pane[0].size().y, size.y);
      }
      return size;
    }

    return false;
  },

  // Gets the minimum size of the widget.
  minSize: function(x, y) {
    // Splitters will only enforce a size if both panes contain a frame
    if (this._pane[0] && this._pane[0] instanceof wcFrameWidget &&
        this._pane[1] && this._pane[1] instanceof wcFrameWidget) {
      var size = this._pane[1].minSize();
      if (!size) {
        size = this._pane[0].minSize();
      } else if (this._pane[0].minSize()) {
        size.x = Math.max(this._pane[0].minSize().x, size.x);
        size.y = Math.max(this._pane[0].minSize().y, size.y);
      }
      return size;
    }

    return false;
  },

  // Gets the desired size of the widget.
  maxSize: function(x, y) {
    // Splitters will only enforce a size if both panes contain a frame
    if (this._pane[0] && this._pane[0] instanceof wcFrameWidget &&
        this._pane[1] && this._pane[1] instanceof wcFrameWidget) {
      var size = this._pane[1].maxSize();
      if (!size) {
        size = this._pane[0].maxSize();
      } else if (this._pane[0].maxSize()) {
        size.x = Math.max(this._pane[0].maxSize().x, size.x);
        size.y = Math.max(this._pane[0].maxSize().y, size.y);
      }
      return size;
    }

    return false;
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
    this.$container = $container;

    if (this.$container) {
      this.$container.append(this.$pane[0]);
      this.$container.append(this.$pane[1]);
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

  pos: function(pos) {
    this._pos = pos;
  },
};