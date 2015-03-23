/**
 * @class
 * A gridded layout for arranging elements. [Panels]{@link wcPanel}, [splitter widgets]{@link wcSplitter}
 * and [tab widgets]{@link wcTabFrame} contain these by default to handle their contents.
 *
 * @constructor
 * @description
 * <b><i>PRIVATE</i> - <u>This should never be constructed directly by the user</u></b>
 * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this layout.
 * @param {wcLayout|wcSplitter|wcDocker} parent   - The layout's parent object.
 */
function wcLayout(container, parent) {
  /**
   * The outer container element of the panel.
   *
   * @member {external:jQuery~Object}
   */
  this.$container = $(container);
  this._parent = parent;

  this._batchProcess = false;
  this._grid = [];

  /**
   * The table DOM element for the layout.
   *
   * @member {external:jQuery~Object}
   */
  this.$table = null;

  this.__init();
};

wcLayout.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Adds an item into the layout, expanding the grid size if necessary.
   *
   * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} item - A DOM element to add.
   * @param {Number} [x=0] - The horizontal grid position to place the element.
   * @param {Number} [y=0] - The vertical grid position to place the element.
   * @param {Number} [w=1] - The number of horizontal cells this item will take within the grid.
   * @param {Number} [h=1] - The number of vertical cells this item will take within the grid.
   *
   * @returns {external:jQuery~Object|Boolean} The table data element of the cell that contains the item, or false if there was a problem.
   */
  addItem: function(item, x, y, w, h) {
    if (typeof x === 'undefined' || x < 0) {
      x = 0;
    }
    if (typeof y === 'undefined' || y < 0) {
      y = 0;
    }
    if (typeof w === 'undefined' || w <= 0) {
      w = 1;
    }
    if (typeof h === 'undefined' || h <= 0) {
      h = 1;
    }

    this.__resizeGrid(x + w - 1, y + h - 1);
    if (w > 1 || h > 1) {
      if (!this.__mergeGrid(x, y, w, h)) {
        return false;
      }
    }

    this._grid[y][x].$el.append($(item));
    return this._grid[y][x].$el;
  },

  /**
   * Retrieves the table data element at a given grid position, if it exists.
   * Note, if an item spans multiple cells, only the top-left most
   * cell will actually contain the table cell element.
   *
   * @param {Number} x - The horizontal grid position.
   * @param {Number} y - The vertical grid position.
   *
   * @returns {external:jQuery~Object|Boolean} - The table data element of
   * the cell, or false if none was found.
   */
  item: function(x, y) {
    if (y >= this._grid.length) {
      return false;
    }

    if (x >= this._grid[y].length) {
      return false;
    }

    return this._grid[y][x].$el;
  },

  /**
   * Clears the contents of the layout and squashes all rows
   * and columns from the grid.
   */
  clear: function() {
    var showGrid = this.showGrid();
    var spacing = this.gridSpacing();
    var alternate = this.gridAlternate();

    this.$table.remove();
    this.__init();

    this.showGrid(showGrid);
    this.gridSpacing(spacing);
    this.gridAlternate(alternate);

    this._grid = [];
  },

  /**
   * Begins a batch operation.  Basically it refrains from constructing
   * the layout grid, which causes a reflow, on each item added.  Instead,
   * The grid is only generated at the end once [wcLayout.finishBatch]{@link wcLayout#finishBatch} is called.
   */
  startBatch: function() {
    this._batchProcess = true;
  },

  /**
   * Ends a batch operation. See [wcLayout.startBatch]{@link wcLayout#startBatch} for more information.
   */
  finishBatch: function() {
    this._batchProcess = false;
    this.__resizeGrid(0, 0);
  },

  /**
   * Gets, or Sets whether the layout grid cells should draw an outline.
   *
   * @param {Boolean} [enabled] - If supplied, will set the grid cell border visibility.
   *
   * @returns {Boolean} - The current visibility state of the grid cells.
   */
  showGrid: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this.$table.toggleClass('wcLayoutGrid', enabled);
    }

    return this.$table.hasClass('wcLayoutGrid');
  },

  /**
   * Gets, or Sets the spacing between cell borders.
   *
   * @param {Number} [size] - If supplied, sets the pixel size of the spacing between cells.
   *
   * @returns {Number} - The current cell spacing in pixels.
   */
  gridSpacing: function(size) {
    if (typeof size !== 'undefined') {
      this.$table.css('border-spacing', size + 'px');
    }

    return parseInt(this.$table.css('border-spacing'));
  },

  /**
   * Gets, or Sets whether the table rows alternate in color based on the theme.
   *
   * @params {Boolean} [enabled] - If supplied, will set whether the grid alternates in color.
   *
   * @returns {Boolean} - Whether the grid alternates in color.
   */
  gridAlternate: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this.$table.toggleClass('wcLayoutGridAlternate', enabled);
    }

    return this.$table.hasClass('wcLayoutGridAlternate');
  },

  /**
   * Retrieves the main scene DOM element.
   * @deprecated please use [wcLayout.$table]{@link wcLayout#$table} directly.
   */
  scene: function() {
    console.log('wcLayout.scene() has been deprecated, please use wcLayout.$table instead.');
    return this.$table;
  },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Initialize
  __init: function() {
    this.$table = $('<table class="wcLayout wcWide wcTall"></table>');
    this.$table.append($('<tbody></tbody>'));
    this.__container(this.$container);
  },

  // Updates the size of the layout.
  __update: function() {
  },

  // Resizes the grid to fit a given position.
  // Params:
  //    width     The width to expand to.
  //    height    The height to expand to.
  __resizeGrid: function(width, height) {
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

    if (!this._batchProcess) {
      var $oldBody = this.$table.find('tbody');
      $('.wcDockerTransition').append($oldBody);

      var $newBody = $('<tbody>');
      for (var y = 0; y < this._grid.length; ++y) {
        var $row = null;

        for (var x = 0; x < this._grid[y].length; ++x) {
          var item = this._grid[y][x];
          if (item.$el) {
            if (!$row) {
              $row = $('<tr>');
              $newBody.append($row);
            }

            $row.append(item.$el);
          }
        }
      }

      this.$table.append($newBody);
      $oldBody.remove();
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
  __mergeGrid: function(x, y, w, h) {
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

  // Checks if the mouse is in a valid anchor position for nesting another widget.
  // Params:
  //    mouse     The current mouse position.
  //    same      Whether the moving frame and this one are the same.
  __checkAnchorDrop: function(mouse, same, ghost, canSplit, $elem, title) {
    var width = $elem.outerWidth();
    var height = $elem.outerHeight();
    var offset = $elem.offset();
    var top = $elem.find('.wcFrameTitle').height();
    if (!title) {
      top = 0;
    }

    if (same) {
      // Same tabs
      if (mouse.y >= offset.top && mouse.y <= offset.top + top &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left-2,
          y: offset.top-2,
          w: width,
          h: top-2,
          loc: wcDocker.DOCK.STACKED,
          item: this,
          self: true,
        });
        return true;
      }
    }

    // Tab ordering or adding.
    if (title) {
      if (mouse.y >= offset.top && mouse.y <= offset.top + top &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left-2,
          y: offset.top-2,
          w: width,
          h: top-2,
          loc: wcDocker.DOCK.STACKED,
          item: this,
          self: false,
        });
        return true;
      }
    }

    if (!canSplit) {
      return false;
    }

    // Check for placeholder.
    if (this._parent instanceof wcPanel && this._parent._isPlaceholder) {
      ghost.anchor(mouse, {
        x: offset.left-2,
        y: offset.top-2,
        w: width,
        h: height,
        loc: wcDocker.DOCK.TOP,
        item: this,
        self: false,
      });
      return true;
    }

    if (width < height) {
      // Top docking.
      if (mouse.y >= offset.top && mouse.y <= offset.top + height*0.25 &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left-2,
          y: offset.top-2,
          w: width,
          h: height*0.5,
          loc: wcDocker.DOCK.TOP,
          item: this,
          self: false,
        });
        return true;
      }

      // Bottom side docking.
      if (mouse.y >= offset.top + height*0.75 && mouse.y <= offset.top + height &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left-2,
          y: offset.top + (height - height*0.5)-2,
          w: width,
          h: height*0.5,
          loc: wcDocker.DOCK.BOTTOM,
          item: this,
          self: false,
        });
        return true;
      }
    }

    // Left side docking
    if (mouse.y >= offset.top && mouse.y <= offset.top + height) {
      if (mouse.x >= offset.left && mouse.x <= offset.left + width*0.25) {
        ghost.anchor(mouse, {
          x: offset.left-2,
          y: offset.top-2,
          w: width*0.5,
          h: height,
          loc: wcDocker.DOCK.LEFT,
          item: this,
          self: false,
        });
        return true;
      }

      // Right side docking
      if (mouse.x >= offset.left + width*0.75 && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left + width*0.5-2,
          y: offset.top-2,
          w: width*0.5,
          h: height,
          loc: wcDocker.DOCK.RIGHT,
          item: this,
          self: false,
        });
        return true;
      }
    }

    if (width >= height) {
      // Top docking.
      if (mouse.y >= offset.top && mouse.y <= offset.top + height*0.25 &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left-2,
          y: offset.top-2,
          w: width,
          h: height*0.5,
          loc: wcDocker.DOCK.TOP,
          item: this,
          self: false,
        });
        return true;
      }

      // Bottom side docking.
      if (mouse.y >= offset.top + height*0.75 && mouse.y <= offset.top + height &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left-2,
          y: offset.top + (height - height*0.5)-2,
          w: width,
          h: height*0.5,
          loc: wcDocker.DOCK.BOTTOM,
          item: this,
          self: false,
        });
        return true;
      }
    }
    return false;
  },

  // Gets, or Sets a new container for this layout.
  // Params:
  //    $container          If supplied, sets a new container for this layout.
  //    parent              If supplied, sets a new parent for this layout.
  // Returns:
  //    JQuery collection   The current container.
  __container: function($container) {
    if (typeof $container === 'undefined') {
      return this.$container;
    }

    this.$container = $container;
    if (this.$container) {
      this.$container.append(this.$table);
    } else {
      this.$table.remove();
    }
    return this.$container;
  },

  // Destroys the layout.
  __destroy: function() {
    this.__container(null);
    this._parent = null;
    this.clear();

    this.$table.remove();
    this.$table = null;
  },
};