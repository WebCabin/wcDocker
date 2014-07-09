/*
  A layout item that organizes the contents of a dock widget.
*/
function wcLayout($container, parent) {
  this.$container = $container;
  this._parent = parent;

  this._border = '0px';
  this._padding = '0px';

  this._grid = [];
  this.$table = null;

  this._init();
};

wcLayout.prototype = {
  _init: function() {
    this.$table = $('<table class="wcLayout wcWide wcTall"></table>');
    this.$table.append($('<tbody></tbody>'));
    this.container(this.$container);
  },

  // Resizes the grid to fit a given position.
  // Params:
  //    width     The width to expand to.
  //    height    The height to expand to.
  _resizeGrid: function(width, height) {
    this.$table.find('tbody').children().remove();

    for (var y = 0; y <= height; ++y) {
      if (this._grid.length <= y) {
        this._grid.push([]);
      }

      for (var x = 0; x <= width; ++x) {
        if (this._grid[y].length <= x) {
          this._grid[y].push({
            $el: $('<td>'),
            x: 0,
            y: 0,
          });
        }
      }
    }

    var $table = this.$table.find('tbody');
    for (var y = 0; y < this._grid.length; ++y) {
      var $row = null;

      for (var x = 0; x < this._grid[y].length; ++x) {
        var item = this._grid[y][x];
        if (item.$el) {
          if (!$row) {
            $row = $('<tr>');
            $table.append($row);
          }

          $row.append(item.$el);
        }
      }
    }
  },

  // Merges cells in the layout.
  // Params:
  //    x, y      Cell position to begin merge.
  //    w, h      The width and height to merge.
  // Returns:
  //    true      Cells were merged succesfully.
  //    false     Merge failed, either because the grid position was out of bounds
  //              or some of the cells were already merged.
  _mergeGrid: function(x, y, w, h) {
    if (this._grid.length <= y || this._grid[y].length <= x) {
      return false;
    }

    // Make sure each cell to be merged is not already merged somewhere else.
    for (var yy = 0; yy < h; ++yy) {
      for (var xx = 0; xx < w; ++xx) {
        var item = this._grid[y + yy][x + xx];
        if (!item.$el || item.x !== 0 || item.y !== 0) {
          return false;
        }
      }
    }

    // Now merge the cells here.
    var item = this._grid[y][x];
    if (w > 1) {
      item.$el.attr('colspan', '' + w);
      item.x = w-1;
    }
    if (h > 1) {
      item.$el.attr('rowspan', '' + h);
      item.y = h-1;
    }

    for (var yy = 0; yy < h; ++yy) {
      for (var xx = 0; xx < w; ++xx) {
        if (yy !== 0 || xx !== 0) {
          var item = this._grid[y + yy][x + xx];
          item.$el.remove();
          item.$el = null;
          item.x = -xx;
          item.y = -yy;
        }
      }
    }
    return true;
  },

  // Updates the size of the layout.
  update: function() {
  },

  // Adds an item into the layout, expanding the grid
  // size if necessary.
  // Params:
  //    $item       The JQuery item to add.
  //    x, y        The grid coordinates to place the item.
  //    w, h        If supplied, will stretch the item among
  //                multiple grid elements.
  // Returns:
  //    <td>        On success, returns the <td> dom element.
  //    false       A failure happened, most likely cells could not be merged.
  addItem: function($item, x, y, w, h) {
    if (typeof w === 'undefined' || w <= 0) {
      w = 1;
    }
    if (typeof h === 'undefined' || h <= 0) {
      h = 1;
    }

    this._resizeGrid(x + w - 1, y + h - 1);
    if (!this._mergeGrid(x, y, w, h)) {
      return false;
    }

    this._grid[y][x].$el.append($item);
    return this._grid[y][x].$el;
  },

  // Clears the layout.
  clear: function() {
    this._init();
    this._grid = [];
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

    this.$table.remove();
    this.$container = $container;
    if (this.$container) {
      this.$container.append(this.$table);
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
  },
};