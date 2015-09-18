/** @module wcLayoutTable */
define([
    "dcl/dcl",
    "./types"
], function (dcl, wcDocker) {

    /**
     * @class module:wcLayoutTable
     * A gridded layout for arranging elements. [Panels]{@link wcPanel}, [splitter widgets]{@link wcSplitter}
     * and [tab widgets]{@link wcTabFrame} contain these by default to handle their contents.
     */
    var Module = dcl(null, {
        declaredClass: 'wcLayoutTable',

        /**
         * @memberOf module:wcLayoutTable
         * @description
         * <b><i>PRIVATE</i> - <u>This should never be constructed directly by the user</u></b>
         * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this layout.
         * @param {wcLayoutSimple|wcLayoutTable|wcSplitter|wcDocker} parent   - The layout's parent object.
         */
        constructor: function (container, parent) {
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
        },
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
         * @returns {wcLayoutTable~tableItem|Boolean} The table data element of the cell that contains the item, or false if there was a problem.
         */
        addItem: function (item, x, y, w, h) {
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
            return this.item(x, y);
        },

        /**
         * Retrieves the table item at a given grid position, if it exists.
         * Note, if an item spans multiple cells, only the top-left most
         * cell will actually contain the table item.
         *
         * @param {Number} x - The horizontal grid position.
         * @param {Number} y - The vertical grid position.
         *
         * @returns {wcLayoutTable~tableItem|Boolean} - The table item, or false if none was found.
         */
        item: function (x, y) {
            if (y >= this._grid.length) {
                return false;
            }

            if (x >= this._grid[y].length) {
                return false;
            }

            // Some cells are a merging of multiple cells. If this cell is
            // part of a merge for another cell, use that cell instead.
            // if (this._grid[y][x].x < 0 || this._grid[y][x].y < 0) {
            //   var grid = this._grid[y][x];
            //   x -= grid.x;
            //   y -= grid.y;
            // }

            var self = this;
            /**
             * The table item is an object that represents one cell in the layout table, it contains
             * convenient methods for cell alteration and supports chaining. Its purpose is
             * to remove the need to alter &lt;tr&gt; and &lt;td&gt; elements of the table directly.
             * @version 3.0.0
             *
             * @example myPanel.addItem(domNode).css('text-align', 'right').css('border', '1px solid black').stretch('100%', '100%');
             *
             * @typedef wcLayoutTable~tableItem
             * @property {jQuery~Object} $ - If you truely need the table cell [jQuery object]{@link jQuery~Object}, here it is.
             * @property {wcLayoutTable~css} css - Wrapper to alter [jQuery's css]{@link http://api.jquery.com/css/} function.
             * @property {wcLayoutTable~stretch} stretch - More reliable method for setting the table item width/height values.
             */
            var myItem = {
                $: self._grid[y][x].$el,

                /**
                 * <small><i>This function is found in {@link wcLayoutTable~tableItem}.</small></i><br>
                 * A wrapper for [jQuery's css]{@link http://api.jquery.com/css/} function.
                 * <b>Note:</b> It is recommended that you use [stretch]{@link wcLayoutTable~stretch} if you intend to alter width or height styles.
                 * @version 3.0.0
                 *
                 * @function wcLayoutTable~css
                 * @param {String} style - The style attribute to alter.
                 * @param {String} [value] - The value of the attribute. If omitted, the current value of the attribute is returned instead of the [tableItem]{@link wcLayoutTable~tableItem} instance.
                 *
                 * @returns {wcLayoutTable~tableItem|String} - Self, for chaining, unless the value parameter was omitted.
                 */
                css: function (style, value) {
                    if (self._grid[y][x].$el) {
                        if (value === undefined) {
                            return self._grid[y][x].$el.css(style);
                        }

                        self._grid[y][x].$el.css(style, value);
                    }
                    return myItem;
                },

                /**
                 * <small><i>This function is found in {@link wcLayoutTable~tableItem}.</small></i><br>
                 * Sets the stretch amount for the current table item. This is more reliable than
                 * assigning width and height style attributes directly on the table item.
                 * @version 3.0.0
                 *
                 * @function wcLayoutTable~stretch
                 * @param {Number|String} [sx] - The horizontal stretch for this grid. Use empty string to clear current value. Can be a pixel position, or a string with a 'px' or '%' suffix.
                 * @param {Number|String} [sy] - The vertical stretch for this grid. Use empty string to clear current value. Can be a pixel position, or a string with a 'px' or '%' suffix.
                 *
                 * @returns {wcLayoutTable~tableItem} - Self, for chaining.
                 */
                stretch: function (width, height) {
                    self.itemStretch(x, y, width, height);
                    return myItem;
                }
            };
            return myItem;
        },

        /**
         * Sets the stretch amount for a given table item. This is more reliable than
         * assigning width and height style attributes directly on the table item.
         * @version 3.0.0
         *
         * @param {Number} x - The horizontal grid position.
         * @param {Number} y - The vertical grid position.
         * @param {Number|String} [sx] - The horizontal stretch for this grid. Use empty string to clear current value. Can be a pixel position, or a string with a 'px' or '%' suffix.
         * @param {Number|String} [sy] - The vertical stretch for this grid. Use empty string to clear current value. Can be a pixel position, or a string with a 'px' or '%' suffix.
         *
         * @returns {Boolean} - Success or failure. A failure generally means your grid position was a merged grid cell.
         */
        itemStretch: function (x, y, sx, sy) {
            var wasBatched = this._batchProcess;

            this._batchProcess = true;
            this.__resizeGrid(x, y);

            var grid = this._grid[y][x];
            if (grid.x < 0 || grid.y < 0) {
                return false;
            }

            if (sx !== undefined) {
                grid.sx = sx;
            }
            if (sy !== undefined) {
                grid.sy = sy;
            }

            this._batchProcess = wasBatched;
            if (!wasBatched) {
                this.__resizeGrid(0, 0);
            }

            return true;
        },

        /**
         * Clears the contents of the layout and squashes all rows
         * and columns from the grid.
         */
        clear: function () {
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
         * The grid is only generated at the end once [wcLayoutTable.finishBatch]{@link wcLayoutTable#finishBatch} is called.
         */
        startBatch: function () {
            this._batchProcess = true;
        },

        /**
         * Ends a batch operation. See [wcLayoutTable.startBatch]{@link wcLayoutTable#startBatch} for more information.
         */
        finishBatch: function () {
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
        showGrid: function (enabled) {
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
        gridSpacing: function (size) {
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
        gridAlternate: function (enabled) {
            if (typeof enabled !== 'undefined') {
                this.$table.toggleClass('wcLayoutGridAlternate', enabled);
            }

            return this.$table.hasClass('wcLayoutGridAlternate');
        },

        /**
         * Retrieves the main element.
         * @returns {external:jQuery~Object} - The Table item that makes this layout scene.
         */
        scene: function () {
            return this.$table;
        },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

        // Initialize
        __init: function () {
            this.$table = $('<table class="wcLayout wcWide wcTall"></table>');
            this.$table.append($('<tbody></tbody>'));
            this.__container(this.$container);
        },

        // Updates the size of the layout.
        __update: function () {
        },

        // Resizes the grid to fit a given position.
        // Params:
        //    width     The width to expand to.
        //    height    The height to expand to.
        __resizeGrid: function (width, height) {
            for (var y = 0; y <= height; ++y) {
                if (this._grid.length <= y) {
                    var row = [];
                    row.$row = $('<tr>');
                    this._grid.push(row);
                }

                for (var x = 0; x <= width; ++x) {
                    if (this._grid[y].length <= x) {
                        this._grid[y].push({
                            $el: $('<td>'),
                            x: 0,
                            y: 0,
                            sx: '',
                            sy: ''
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
                                $row = this._grid[y].$row;
                                $newBody.append($row);
                            }

                            item.$el.css('width', item.sx);
                            item.$el.css('height', item.sy);
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
        __mergeGrid: function (x, y, w, h) {
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
                item.x = w - 1;
            }
            if (h > 1) {
                item.$el.attr('rowspan', '' + h);
                item.y = h - 1;
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
        //    mouse                 The current mouse position.
        //    same                  Whether we are hovering over the same panel that is being moved.
        //    ghost                 An instance to the ghost object.
        //    canSplit              Whether the original panel can be split.
        //    $elem                 The container element for the target panel.
        //    title                 Whether the panel has a title bar visible.
        //    isTopper              Whether the item being dragged is the top title bar, as apposed to dragging a side or bottom tab/bar.
        //    forceTabOrientation   Force a specific tab orientation.
        //    allowEdges            Whether to allow edge docking.
        __checkAnchorDrop: function (mouse, same, ghost, canSplit, $elem, title, isTopper, forceTabOrientation, allowEdges) {
            var docker = this._parent.docker();
            var width = $elem.outerWidth();
            var height = $elem.outerHeight();
            var offset = $elem.offset();
            var titleSize = $elem.find('.wcFrameTitleBar').height();
            if (!title) {
                titleSize = 0;
            }

            function __getAnchorSizes(value, w, h) {
                if (typeof value === 'number' || (typeof value === 'string' && value.indexOf('px', value.length - 2) !== -1)) {
                    // Pixel sizing.
                    value = parseInt(value);
                    return {
                        x: value,
                        y: value
                    };
                } else if (typeof value === 'string' && value.indexOf('%', value.length - 1) !== -1) {
                    value = parseInt(value) / 100;
                    // Percentage sizing.
                    return {
                        x: w * value,
                        y: h * value
                    };
                } else {
                    // Invalid value.
                    return {x: 0, y: 0};
                }
            }

            var edgeAnchor = __getAnchorSizes(docker._options.edgeAnchorSize, docker.$container.outerWidth(), docker.$container.outerHeight());
            var panelAnchor = __getAnchorSizes(docker._options.panelAnchorSize, width, height);

            // If the target panel has a title, hovering over it (on all sides) will cause stacking
            // and also change the orientation of the tabs (if enabled).
            if (title) {
                // Top title bar
                if ((!forceTabOrientation || forceTabOrientation === wcDocker.TAB.TOP) &&
                    mouse.y >= offset.top && mouse.y <= offset.top + titleSize &&
                    mouse.x >= offset.left && mouse.x <= offset.left + width) {

                    // Stacking with top orientation.
                    ghost.anchor(mouse, {
                        x: offset.left - 2,
                        y: offset.top - 2,
                        w: width,
                        h: titleSize - 2,
                        loc: wcDocker.DOCK.STACKED,
                        tab: wcDocker.TAB.TOP,
                        item: this,
                        self: same === wcDocker.TAB.TOP || (isTopper && same)
                    });
                    return true;
                }
                // Any other tab orientation is only valid if tab orientation is enabled.
                else if (docker._canOrientTabs) {
                    // Bottom bar
                    if ((!forceTabOrientation || forceTabOrientation === wcDocker.TAB.BOTTOM) &&
                        mouse.y >= offset.top + height - titleSize && mouse.y <= offset.top + height &&
                        mouse.x >= offset.left && mouse.x <= offset.left + width) {

                        // Stacking with bottom orientation.
                        ghost.anchor(mouse, {
                            x: offset.left - 2,
                            y: offset.top + height - titleSize - 2,
                            w: width,
                            h: titleSize,
                            loc: wcDocker.DOCK.STACKED,
                            tab: wcDocker.TAB.BOTTOM,
                            item: this,
                            self: same === wcDocker.TAB.BOTTOM
                        });
                        return true;
                    }
                    // Left bar
                    else if ((!forceTabOrientation || forceTabOrientation === wcDocker.TAB.LEFT) &&
                        mouse.y >= offset.top && mouse.y <= offset.top + height &&
                        mouse.x >= offset.left && mouse.x <= offset.left + titleSize) {

                        // Stacking with bottom orientation.
                        ghost.anchor(mouse, {
                            x: offset.left - 2,
                            y: offset.top - 2,
                            w: titleSize - 2,
                            h: height,
                            loc: wcDocker.DOCK.STACKED,
                            tab: wcDocker.TAB.LEFT,
                            item: this,
                            self: same === wcDocker.TAB.LEFT
                        });
                        return true;
                    }
                    // Right bar
                    else if ((!forceTabOrientation || forceTabOrientation === wcDocker.TAB.RIGHT) &&
                        mouse.y >= offset.top && mouse.y <= offset.top + height &&
                        mouse.x >= offset.left + width - titleSize && mouse.x <= offset.left + width) {

                        // Stacking with bottom orientation.
                        ghost.anchor(mouse, {
                            x: offset.left + width - titleSize - 2,
                            y: offset.top - 2,
                            w: titleSize,
                            h: height,
                            loc: wcDocker.DOCK.STACKED,
                            tab: wcDocker.TAB.RIGHT,
                            item: this,
                            self: same === wcDocker.TAB.RIGHT
                        });
                        return true;
                    }
                }
            }

            // Test for edge anchoring.
            if (allowEdges && ghost._outer && ghost._inner) {
                var outerWidth = ghost._outer.$container.outerWidth();
                var outerHeight = ghost._outer.$container.outerHeight();
                var outerOffset = ghost._outer.$container.offset();

                // Left edge
                if (mouse.y >= outerOffset.top && mouse.y <= outerOffset.top + outerHeight &&
                    mouse.x >= outerOffset.left + titleSize && mouse.x <= outerOffset.left + titleSize + edgeAnchor.x) {
                    ghost.anchor(mouse, {
                        x: outerOffset.left - 2,
                        y: outerOffset.top - 2,
                        w: outerWidth / 3,
                        h: outerHeight,
                        loc: wcDocker.DOCK.LEFT,
                        item: ghost._inner,
                        self: false
                    });
                    return true;
                }
                // Right edge
                else if (mouse.y >= outerOffset.top && mouse.y <= outerOffset.top + outerHeight &&
                    mouse.x >= outerOffset.left + outerWidth - edgeAnchor.x - titleSize && mouse.x <= outerOffset.left + outerWidth - titleSize) {
                    ghost.anchor(mouse, {
                        x: outerOffset.left + outerWidth - (outerWidth / 3) - 2,
                        y: outerOffset.top - 2,
                        w: outerWidth / 3,
                        h: outerHeight,
                        loc: wcDocker.DOCK.RIGHT,
                        item: ghost._inner,
                        self: false
                    });
                    return true;
                }
                // Top edge
                else if (mouse.y >= outerOffset.top + titleSize && mouse.y <= outerOffset.top + titleSize + edgeAnchor.y &&
                    mouse.x >= outerOffset.left && mouse.x <= outerOffset.left + outerWidth) {
                    ghost.anchor(mouse, {
                        x: outerOffset.left - 2,
                        y: outerOffset.top - 2,
                        w: outerWidth,
                        h: outerHeight / 3,
                        loc: wcDocker.DOCK.TOP,
                        item: ghost._inner,
                        self: false
                    });
                    return true;
                }
                // Bottom edge
                else if (mouse.y >= outerOffset.top + outerHeight - titleSize - edgeAnchor.y && mouse.y <= outerOffset.top + outerHeight - titleSize &&
                    mouse.x >= outerOffset.left && mouse.x <= outerOffset.left + outerWidth) {
                    ghost.anchor(mouse, {
                        x: outerOffset.left - 2,
                        y: outerOffset.top + outerHeight - (outerHeight / 3) - 2,
                        w: outerWidth,
                        h: outerHeight / 3,
                        loc: wcDocker.DOCK.BOTTOM,
                        item: ghost._inner,
                        self: false
                    });
                    return true;
                }
            }

            if (!canSplit) {
                return false;
            }

            // Check for placeholder.
            if (this._parent && this._parent.instanceOf('wcPanel') && this._parent._isPlaceholder) {
                ghost.anchor(mouse, {
                    x: offset.left - 2,
                    y: offset.top - 2,
                    w: width,
                    h: height,
                    loc: wcDocker.DOCK.TOP,
                    item: this,
                    self: false
                });
                return true;
            }

            if (width < height) {
                // Top docking.
                if (mouse.y >= offset.top && mouse.y <= offset.top + titleSize + panelAnchor.y &&
                    mouse.x >= offset.left && mouse.x <= offset.left + width) {
                    ghost.anchor(mouse, {
                        x: offset.left - 2,
                        y: offset.top - 2,
                        w: width,
                        h: height * 0.5,
                        loc: wcDocker.DOCK.TOP,
                        item: this,
                        self: false
                    });
                    return true;
                }

                // Bottom side docking.
                if (mouse.y >= offset.top + height - panelAnchor.y - titleSize && mouse.y <= offset.top + height &&
                    mouse.x >= offset.left && mouse.x <= offset.left + width) {
                    ghost.anchor(mouse, {
                        x: offset.left - 2,
                        y: offset.top + (height - height * 0.5) - 2,
                        w: width,
                        h: height * 0.5,
                        loc: wcDocker.DOCK.BOTTOM,
                        item: this,
                        self: false
                    });
                    return true;
                }
            }

            // Left side docking
            if (mouse.y >= offset.top && mouse.y <= offset.top + height) {
                if (mouse.x >= offset.left && mouse.x <= offset.left + panelAnchor.x + titleSize) {
                    ghost.anchor(mouse, {
                        x: offset.left - 2,
                        y: offset.top - 2,
                        w: width * 0.5,
                        h: height,
                        loc: wcDocker.DOCK.LEFT,
                        item: this,
                        self: false
                    });
                    return true;
                }

                // Right side docking
                if (mouse.x >= offset.left + width - panelAnchor.x - titleSize && mouse.x <= offset.left + width) {
                    ghost.anchor(mouse, {
                        x: offset.left + width * 0.5 - 2,
                        y: offset.top - 2,
                        w: width * 0.5,
                        h: height,
                        loc: wcDocker.DOCK.RIGHT,
                        item: this,
                        self: false
                    });
                    return true;
                }
            }

            if (width >= height) {
                // Top docking.
                if (mouse.y >= offset.top && mouse.y <= offset.top + panelAnchor.y + titleSize &&
                    mouse.x >= offset.left && mouse.x <= offset.left + width) {
                    ghost.anchor(mouse, {
                        x: offset.left - 2,
                        y: offset.top - 2,
                        w: width,
                        h: height * 0.5,
                        loc: wcDocker.DOCK.TOP,
                        item: this,
                        self: false
                    });
                    return true;
                }

                // Bottom side docking.
                if (mouse.y >= offset.top + height - panelAnchor.y - titleSize && mouse.y <= offset.top + height &&
                    mouse.x >= offset.left && mouse.x <= offset.left + width) {
                    ghost.anchor(mouse, {
                        x: offset.left - 2,
                        y: offset.top + (height - height * 0.5) - 2,
                        w: width,
                        h: height * 0.5,
                        loc: wcDocker.DOCK.BOTTOM,
                        item: this,
                        self: false
                    });
                    return true;
                }
            }
            return false;
        },

        // Gets, or Sets a new container for this layout.
        // Params:
        //    $container          If supplied, sets a new container for this layout.
        // Returns:
        //    JQuery collection   The current container.
        __container: function ($container) {
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
        __destroy: function () {
            this.__container(null);
            this._parent = null;
            this.clear();

            this.$table.remove();
            this.$table = null;
        }
    });

    // window['wcLayoutTable'] = Module;

    return Module;

});
