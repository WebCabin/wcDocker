/** @module wcSplitter */
define([
    "dcl/dcl",
    "./types",
    "./layoutsimple",
    "./layouttable",
    "./base"
], function (dcl, wcDocker, wcLayoutSimple, wcLayoutTable, base) {

    var layoutClasses = {
      'wcLayoutSimple': wcLayoutSimple,
      'wcLayoutTable': wcLayoutTable
    };

    /**
     * @class module:wcSplitter
     * Splits an area in two, dividing it with a resize-able splitter bar. This is the same class
     * used throughout [docker]{@link module:wcDocker} to organize the docking interface, but it can also
     * be used inside a panel as a custom widget.
     * <b>Note:</b> The container needs to be positioned in either absolute or relative coordinates in css.
     */
    var Module = dcl(base, {

        declaredClass: 'wcSplitter',

        /**
         * @memberOf module:wcSplitter
         * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this splitter.
         * @param {wcLayoutSimple|wcLayoutTable|wcSplitter|wcDocker} parent   - The splitter's parent object.
         * @param {module:wcDocker.ORIENTATION} orientation      - The orientation of the splitter bar.
         */
        constructor:function(container, parent, orientation) {
            this.$container = $(container);
            this._parent = parent;
            this._orientation = orientation;

            this._pane = [false, false];
            /**
             * An array of two elements representing each side of the splitter.
             * Index 0 is always either top or left depending on [orientation]{@link module:wcDocker.ORIENTATION}.
             * @member
             * @type {external:jQuery~Object[]}
             */
            this.$pane = [];
            this.$bar = null;
            this._pos = 0.5;
            this._posTarget = 0.5;
            this._pixelPos = -1;
            this._findBestPos = false;
            this._anim = 0;

            this._boundEvents = [];

            this.__init();

            this.docker()._splitterList.push(this);
        },
        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        // Public Functions
        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        /**
         * Initializes the two [panes]{@link module:wcSplitter#$pane} of the splitter with its own layouts.<br>
         * This should be used to initialize the splitter when creating one for use inside your panel.
         *
         * @param {module:wcDocker.LAYOUT} [topLeftLayout=wcDocker.LAYOUT.TABLE] - The type of layout to use for the top or left pane.
         * @param {module:wcDocker.LAYOUT} [bottomRightLayout=wcDocker.LAYOUT.TABLE] - The type of layout to use for the bottom or right pane.
         */
        initLayouts: function (topLeftLayout, bottomRightLayout) {
            var layoutClass = topLeftLayout || 'wcLayoutTable';
            var layout0 = new layoutClasses[layoutClass](this.$pane[0], this);

            layoutClass = bottomRightLayout || 'wcLayoutTable';
            var layout1 = new layoutClasses[layoutClass](this.$pane[1], this);

            this.pane(0, layout0);
            this.pane(1, layout1);
        },

        /**
         * Gets, or Sets the orientation of the splitter.
         *
         * @param {module:wcDocker.ORIENTATION} orientation - The new orientation of the splitter.
         */
        orientation: function (orientation) {
            if (typeof orientation === 'undefined') {
                return this._orientation;
            }

            if (this._orientation != orientation) {
                this._orientation = orientation;

                if (this._orientation) {
                    // this.$pane[0].removeClass('wcWide').addClass('wcTall');
                    // this.$pane[1].removeClass('wcWide').addClass('wcTall');
                    this.$bar.removeClass('wcWide').removeClass('wcSplitterBarH').addClass('wcTall').addClass('wcSplitterBarV');
                } else {
                    // this.$pane[0].removeClass('wcTall').addClass('wcWide');
                    // this.$pane[1].removeClass('wcTall').addClass('wcWide');
                    this.$bar.removeClass('wcTall').removeClass('wcSplitterBarV').addClass('wcWide').addClass('wcSplitterBarH');
                }

                this.$pane[0].css('top', '').css('left', '').css('width', '').css('height', '');
                this.$pane[1].css('top', '').css('left', '').css('width', '').css('height', '');
                this.$bar.css('top', '').css('left', '').css('width', '').css('height', '');
                this.__update();

                if (this._parent && this._parent.instanceOf('wcPanel')) {
                    this._parent.__trigger(wcDocker.EVENT.UPDATED);
                }
            }
        },

        /**
         * Gets the minimum size constraint of the outer splitter area.
         *
         * @returns {module:wcDocker~Size} The minimum size.
         */
        minSize: function () {
            var minSize1;
            var minSize2;
            if (this._pane[0] && typeof this._pane[0].minSize === 'function') {
                minSize1 = this._pane[0].minSize();
            }

            if (this._pane[1] && typeof this._pane[1].minSize === 'function') {
                minSize2 = this._pane[1].minSize();
            }

            if (minSize1 && minSize2) {
                if (this._orientation) {
                    minSize1.x += minSize2.x;
                    minSize1.y = Math.max(minSize1.y, minSize2.y);
                } else {
                    minSize1.y += minSize2.y;
                    minSize1.x = Math.max(minSize1.x, minSize2.x);
                }
                return minSize1;
                return {
                    x: Math.min(minSize1.x, minSize2.x),
                    y: Math.min(minSize1.y, minSize2.y)
                };
            } else if (minSize1) {
                return minSize1;
            } else if (minSize2) {
                return minSize2;
            }

            return false;
        },

        /**
         * Gets the maximum size constraint of the outer splitter area.
         *
         * @returns {module:wcDocker~Size} - The maximum size.
         */
        maxSize: function () {
            var maxSize1;
            var maxSize2;
            if (this._pane[0] && typeof this._pane[0].maxSize === 'function') {
                maxSize1 = this._pane[0].maxSize();
            }

            if (this._pane[1] && typeof this._pane[1].maxSize === 'function') {
                maxSize2 = this._pane[1].maxSize();
            }

            if (maxSize1 && maxSize2) {
                if (this._orientation) {
                    maxSize1.x += maxSize2.x;
                    maxSize1.y = Math.min(maxSize1.y, maxSize2.y);
                } else {
                    maxSize1.y += maxSize2.y;
                    maxSize1.x = Math.min(maxSize1.x, maxSize2.x);
                }
                return maxSize1;
                return {
                    x: Math.min(maxSize1.x, maxSize2.x),
                    y: Math.min(maxSize1.y, maxSize2.y)
                };
            } else if (maxSize1) {
                return maxSize1;
            } else if (maxSize2) {
                return maxSize2;
            }

            return false;
        },

        /**
         * Get, or Set the current splitter position.
         *
         * @param {Number} [value] - If supplied, assigns a new splitter position. Value must be a percentage value between 0 and 1.
         *
         * @returns {Number} - The current position.
         */
        pos: function (value) {
            if (typeof value !== 'undefined') {
                this._pos = this._posTarget = value;
                this.__update();

                if (this._parent && this._parent.instanceOf('wcPanel')) {
                    this._parent.__trigger(wcDocker.EVENT.UPDATED);
                }
            }

            return this._posTarget;
        },

        /**
         * Animates to a given splitter position.
         *
         * @param {Number} value - Assigns the target splitter position. Value must be a percentage between 0 and 1.
         * @param {module:wcSplitter~onFinished} - A finished event handler.
         */
        animPos: function (value, callback) {
            this._posTarget = value;
            var self = this;
            this.$bar.queue(function (next) {
                if (self._anim) {
                    clearInterval(self._anim);
                }
                self._anim = setInterval(function () {
                    if (self._pos > self._posTarget) {
                        self._pos -= (self._pos - self._posTarget) / 5;
                        if (self._pos <= self._posTarget + 0.01) {
                            self._pos = self._posTarget;
                        }
                    }

                    if (self._pos < self._posTarget) {
                        self._pos += (self._posTarget - self._pos) / 5;
                        if (self._pos >= self._posTarget - 0.01) {
                            self._pos = self._posTarget;
                        }
                    }

                    self.__update();
                    if (self._pos == self._posTarget) {
                        callback && callback();
                        next();
                        clearInterval(self._anim);
                        self._anim = 0;
                    }
                }, 5);
            });
            this.$bar.dequeue();
        },

        /**
         * Gets, or Sets the element associated with a pane.
         *
         * @param {Number} index - The index of the pane, only 0 and 1 are valid.
         * @param {module:wcLayoutSimple|wcLayoutTable|wcPanel|wcFrame|wcSplitter} [item] - If supplied, the pane will be replaced with this item.
         *
         * @returns {module:wcLayoutSimple|wcLayoutTable|wcPanel|wcFrame|wcSplitter|Boolean} - The current object assigned to the pane, or false.
         */
        pane: function (index, item) {
            if (index >= 0 && index < 2) {
                if (typeof item === 'undefined') {
                    return this._pane[index];
                } else {
                    if (item) {
                        this._pane[index] = item;
                        item._parent = this;
                        item.__container(this.$pane[index]);

                        if (this._pane[0] && this._pane[1]) {
                            this.__update();
                        }
                        return item;
                    } else if (this._pane[index]) {
                        this._pane[index].__container(null);
                        this._pane[index] = false;
                    }
                }
            }
            // this.__update();
            return false;
        },

        /**
         * Gets, or Sets the element associated with the left side pane (for horizontal layouts).
         *
         * @param {module:wcLayoutSimple|wcLayoutTable|wcPanel|wcFrame|wcSplitter} [item] - If supplied, the pane will be replaced with this item.
         *
         * @returns {module:wcLayoutSimple|wcLayoutTable|wcPanel|wcFrame|wcSplitter|Boolean} - The current object assigned to the pane, or false.
         */
        left: function (item) {
            return this.pane(0, item);
        },

        /**
         * Gets, or Sets the element associated with the right side pane (for horizontal layouts).
         *
         * @param {module:wcLayoutSimple|wcLayoutTable|wcPanel|wcFrame|wcSplitter} [item] - If supplied, the pane will be replaced with this item.
         *
         * @returns {module:wcLayoutSimple|wcLayoutTable|wcPanel|wcFrame|wcSplitter|Boolean} - The current object assigned to the pane, or false.
         */
        right: function (item) {
            return this.pane(1, item);
        },

        /**
         * Gets, or Sets the element associated with the top pane (for vertical layouts).
         *
         * @param {module:wcLayoutSimple|wcLayoutTable|wcPanel|wcFrame|wcSplitter} [item] - If supplied, the pane will be replaced with this item.
         *
         * @returns {module:wcLayoutSimple|wcLayoutTable|wcPanel|wcFrame|wcSplitter|Boolean} - The current object assigned to the pane, or false.
         */
        top: function (item) {
            return this.pane(0, item);
        },

        /**
         * Gets, or Sets the element associated with the bottom pane (for vertical layouts).
         *
         * @param {module:wcLayoutSimple|wcLayoutTable|wcPanel|wcFrame|wcSplitter} [item] - If supplied, the pane will be replaced with this item.
         *
         * @returns {module:wcLayoutSimple|wcLayoutTable|wcPanel|wcFrame|wcSplitter|Boolean} - The current object assigned to the pane, or false.
         */
        bottom: function (item) {
            return this.pane(1, item);
        },

        /**
         * Gets, or Sets whether a pane can be scrolled via scroll bars.
         * By default, scrolling is enabled in both directions.
         *
         * @param {Number} index - The index of the pane, only 0 and 1 are valid.
         * @param {Boolean} [x] - Whether to allow scrolling in the horizontal direction.
         * @param {Boolean} [y] - Whether to allow scrolling in the vertical direction.
         *
         * @returns {module:wcDocker~Scrollable} - The current scroll state for each direction.
         */
        scrollable: function (index, x, y) {
            if (typeof x !== 'undefined') {
                this.$pane[index].toggleClass('wcScrollableX', x);
            }
            if (typeof y !== 'undefined') {
                this.$pane[index].toggleClass('wcScrollableY', y);
            }

            return {
                x: this.$pane[index].hasClass('wcScrollableX'),
                y: this.$pane[index].hasClass('wcScrollableY')
            };
        },

        /**
         * Destroys the splitter.
         *
         * @param {Boolean} [destroyPanes=true] - If true, both panes attached will be destroyed as well. Use false if you plan to continue using the objects assigned to each pane, or make sure to remove them first before destruction.
         */
        destroy: function (destroyPanes) {
            var docker = this.docker();
            if (docker) {
                var index = this.docker()._splitterList.indexOf(this);
                if (index > -1) {
                    this.docker()._splitterList.splice(index, 1);
                }
            }

            if (destroyPanes === undefined || destroyPanes) {
                this.__destroy();
            } else {
                this.__container(null);
            }
        },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

        // Initialize
        __init: function () {
            this.$pane.push($('<div class="wcLayoutPane wcScrollableX wcScrollableY">'));
            this.$pane.push($('<div class="wcLayoutPane wcScrollableX wcScrollableY">'));
            this.$bar = $('<div class="wcSplitterBar">');

            if (this._orientation) {
                // this.$pane[0].addClass('wcTall');
                // this.$pane[1].addClass('wcTall');
                this.$bar.addClass('wcTall').addClass('wcSplitterBarV');
            } else {
                // this.$pane[0].addClass('wcWide');
                // this.$pane[1].addClass('wcWide');
                this.$bar.addClass('wcWide').addClass('wcSplitterBarH');
            }

            this.__container(this.$container);

            if (this._parent && this._parent.instanceOf('wcPanel')) {
                this._boundEvents.push({event: wcDocker.EVENT.UPDATED, handler: this.__update.bind(this)});
                this._boundEvents.push({event: wcDocker.EVENT.CLOSED, handler: this.destroy.bind(this)});

                for (var i = 0; i < this._boundEvents.length; ++i) {
                    this._parent.on(this._boundEvents[i].event, this._boundEvents[i].handler);
                }
            }
        },

        // Updates the size of the splitter.
        __update: function (opt_dontMove) {
            var width = this.$container.outerWidth();
            var height = this.$container.outerHeight();

            var minSize = this.__minPos();
            var maxSize = this.__maxPos();

            if (this._findBestPos) {
                this._findBestPos = false;

                var size1;
                var size2;
                if (this._pane[0] && typeof this._pane[0].initSize === 'function') {
                    size1 = this._pane[0].initSize();
                    if (size1) {
                        if (size1.x < 0) {
                            size1.x = width / 2;
                        }
                        if (size1.y < 0) {
                            size1.y = height / 2;
                        }
                    }
                }

                if (this._pane[1] && typeof this._pane[1].initSize === 'function') {
                    size2 = this._pane[1].initSize();
                    if (size2) {
                        if (size2.x < 0) {
                            size2.x = width / 2;
                        }
                        if (size2.y < 0) {
                            size2.y = height / 2;
                        }

                        size2.x = width - size2.x;
                        size2.y = height - size2.y;
                    }
                }

                var size;
                if (size1 && size2) {
                    size = {
                        x: Math.min(size1.x, size2.x),
                        y: Math.min(size1.y, size2.y)
                    };
                } else if (size1) {
                    size = size1;
                } else if (size2) {
                    size = size2;
                }

                if (size) {
                    if (this._orientation) {
                        this._pos = size.x / width;
                    } else {
                        this._pos = size.y / height;
                    }
                }
            }

            this.$bar.toggleClass('wcSplitterBarStatic', this.__isStatic());

            if (this._orientation === wcDocker.ORIENTATION.HORIZONTAL) {
                var barSize = this.$bar.outerWidth() / 2;
                var barBorder = parseInt(this.$bar.css('border-top-width')) + parseInt(this.$bar.css('border-bottom-width'));
                if (opt_dontMove) {
                    var offset = this._pixelPos - (this.$container.offset().left + parseInt(this.$container.css('border-left-width'))) - this.$bar.outerWidth() / 2;
                    this._pos = offset / (width - this.$bar.outerWidth());
                }

                this._pos = Math.min(Math.max(this._pos, 0), 1);
                var size = (width - this.$bar.outerWidth()) * this._pos + barSize;
                if (minSize) {
                    size = Math.max(minSize.x, size);
                }
                if (maxSize) {
                    size = Math.min(maxSize.x, size);
                }

                var top = 0;
                var bottom = 0;
                if (this._parent && this._parent.declaredClass === 'wcCollapser') {
                    var $outer = this.docker().$container;
                    var $inner = this._parent.$container;

                    top = $inner.offset().top - $outer.offset().top;
                    bottom = ($outer.offset().top + $outer.outerHeight()) - ($inner.offset().top + $inner.outerHeight());
                }

                // Bar is top to bottom
                this.$bar.css('left', size - barSize);
                this.$bar.css('top', top);
                this.$bar.css('height', height - barBorder - bottom);
                this.$pane[0].css('width', size - barSize);
                this.$pane[0].css('left', '0px');
                this.$pane[0].css('right', '');
                this.$pane[0].css('top', top);
                this.$pane[0].css('bottom', bottom);
                this.$pane[1].css('left', '');
                this.$pane[1].css('right', '0px');
                this.$pane[1].css('width', width - size - barSize - parseInt(this.$container.css('border-left-width')) * 2);
                this.$pane[1].css('top', top);
                this.$pane[1].css('bottom', bottom);

                this._pixelPos = this.$bar.offset().left + barSize;
            } else {
                var barSize = this.$bar.outerHeight() / 2;
                var barBorder = parseInt(this.$bar.css('border-left-width')) + parseInt(this.$bar.css('border-right-width'));
                if (opt_dontMove) {
                    var offset = this._pixelPos - (this.$container.offset().top + parseInt(this.$container.css('border-top-width'))) - this.$bar.outerHeight() / 2;
                    this._pos = offset / (height - this.$bar.outerHeight());
                }

                this._pos = Math.min(Math.max(this._pos, 0), 1);
                var size = (height - this.$bar.outerHeight()) * this._pos + barSize;
                if (minSize) {
                    size = Math.max(minSize.y, size);
                }
                if (maxSize) {
                    size = Math.min(maxSize.y, size);
                }

                var left = 0;
                var right = 0;
                if (this._parent && this._parent.declaredClass === 'wcCollapser') {
                    var $outer = this.docker().$container;
                    var $inner = this._parent.$container;

                    left = $inner.offset().left - $outer.offset().left;
                    right = ($outer.offset().left + $outer.outerWidth()) - ($inner.offset().left + $inner.outerWidth());
                }

                // Bar is left to right
                this.$bar.css('top', size - barSize);
                this.$bar.css('left', left);
                this.$bar.css('width', width - barBorder - bottom);
                this.$pane[0].css('height', size - barSize);
                this.$pane[0].css('top', '0px');
                this.$pane[0].css('bottom', '');
                this.$pane[0].css('left', left);
                this.$pane[0].css('right', right);
                this.$pane[1].css('top', '');
                this.$pane[1].css('bottom', '0px');
                this.$pane[1].css('height', height - size - barSize - parseInt(this.$container.css('border-top-width')) * 2);
                this.$pane[1].css('left', left);
                this.$pane[1].css('right', right);

                this._pixelPos = this.$bar.offset().top + barSize;
            }

            if (opt_dontMove === undefined) {
                opt_dontMove = true;
            }
            this._pane[0] && this._pane[0].__update(opt_dontMove);
            this._pane[1] && this._pane[1].__update(opt_dontMove);
        },

        // Saves the current panel configuration into a meta
        // object that can be used later to restore it.
        __save: function () {
            // If this is a collapser splitter, do not save it, skip to the children.
            if (this._pane[0] && this._pane[0].declaredClass === 'wcCollapser') {
                return this._pane[1].__save();
            }
            if (this._pane[1] && this._pane[1].declaredClass === 'wcCollapser') {
                return this._pane[0].__save();
            }

            var data = {};
            data.type = 'wcSplitter';
            data.horizontal = this._orientation;
            data.isDrawer = this.$bar.hasClass('wcDrawerSplitterBar');
            data.pane0 = this._pane[0] ? this._pane[0].__save() : null;
            data.pane1 = this._pane[1] ? this._pane[1].__save() : null;
            data.pos = this._pos;
            return data;
        },

        // Restores a previously saved configuration.
        __restore: function (data, docker) {
            this._pos = data.pos;
            if (data.isDrawer) {
                this.$bar.addClass('wcDrawerSplitterBar');
            }
            if (data.pane0) {
                this._pane[0] = docker.__create(data.pane0, this, this.$pane[0]);
                this._pane[0].__restore(data.pane0, docker);
            }
            if (data.pane1) {
                this._pane[1] = docker.__create(data.pane1, this, this.$pane[1]);
                this._pane[1].__restore(data.pane1, docker);
            }
        },

        // Attempts to find the best splitter position based on
        // the contents of each pane.
        __findBestPos: function () {
            this._findBestPos = true;
        },

        // Moves the slider bar based on a mouse position.
        // Params:
        //    mouse       The mouse offset position.
        __moveBar: function (mouse) {
            var offset = this.$container.offset();
            mouse.x -= offset.left;
            mouse.y -= offset.top;

            if (this._orientation === wcDocker.ORIENTATION.HORIZONTAL) {
                var width = this.$container.outerWidth() - this.$bar.outerWidth();
                mouse.x += 1 - parseInt(this.$container.css('border-left-width')) - (this.$bar.outerWidth() / 2);
                this.pos(mouse.x / width);
            } else {
                var height = this.$container.outerHeight() - this.$bar.outerHeight();
                mouse.y += 1 - parseInt(this.$container.css('border-top-width')) - (this.$bar.outerHeight() / 2);
                this.pos(mouse.y / height);
            }
        },

        // Gets the minimum position of the splitter divider.
        __minPos: function () {
            var width = this.$container.outerWidth();
            var height = this.$container.outerHeight();

            var minSize;
            if (this._pane[0] && typeof this._pane[0].minSize === 'function') {
                minSize = this._pane[0].minSize();
            } else {
                minSize = {x: 50, y: 50};
            }

            var maxSize;
            if (this._pane[1] && typeof this._pane[1].maxSize === 'function') {
                maxSize = this._pane[1].maxSize();
            } else {
                maxSize = {x: width, y: height};
            }

            if (this._orientation === wcDocker.ORIENTATION.HORIZONTAL) {
                var barSize = this.$bar.outerWidth() / 2;
                minSize.x += barSize;
                width -= barSize;
            } else {
                var barSize = this.$bar.outerHeight() / 2;
                minSize.y += barSize;
                height -= barSize;
            }

            maxSize.x = width - Math.min(maxSize.x, width);
            maxSize.y = height - Math.min(maxSize.y, height);

            minSize.x = Math.max(minSize.x, maxSize.x);
            minSize.y = Math.max(minSize.y, maxSize.y);

            return minSize;
        },

        // Gets the maximum position of the splitter divider.
        __maxPos: function () {
            var width = this.$container.outerWidth();
            var height = this.$container.outerHeight();

            var maxSize;
            if (this._pane[0] && typeof this._pane[0].maxSize === 'function') {
                maxSize = this._pane[0].maxSize();
            } else {
                maxSize = {x: width, y: height};
            }

            var minSize;
            if (this._pane[1] && typeof this._pane[1].minSize === 'function') {
                minSize = this._pane[1].minSize();
            } else {
                minSize = {x: 50, y: 50};
            }

            if (this._orientation === wcDocker.ORIENTATION.HORIZONTAL) {
                var barSize = this.$bar.outerWidth() / 2;
                maxSize.x += barSize;
                width -= barSize;
            } else {
                var barSize = this.$bar.outerHeight() / 2;
                maxSize.y += barSize;
                height -= barSize;
            }

            minSize.x = width - minSize.x;
            minSize.y = height - minSize.y;

            maxSize.x = Math.min(minSize.x, maxSize.x);
            maxSize.y = Math.min(minSize.y, maxSize.y);
            return maxSize;
        },

        // Retrieves whether the splitter is static (not moveable).
        __isStatic: function () {
            var attr = this._orientation === wcDocker.ORIENTATION.HORIZONTAL ? 'x' : 'y';
            for (var i = 0; i < 2; ++i) {
                if (this._pane[i] && this._pane[i].minSize && this._pane[i].maxSize &&
                    this._pane[i].maxSize()[attr] - this._pane[i].minSize()[attr] === 0) {
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
        __container: function ($container) {
            if (typeof $container === 'undefined') {
                return this.$container;
            }

            this.$container = $container;

            if (this.$container) {
                this.$container.append(this.$pane[0]);
                this.$container.append(this.$pane[1]);
                this.$container.append(this.$bar);
            } else {
                this.$pane[0].remove();
                this.$pane[1].remove();
                this.$bar.remove();
            }
            return this.$container;
        },

        // Removes a child from this splitter.
        // Params:
        //    child         The child to remove.
        __removeChild: function (child) {
            if (this._pane[0] === child) {
                this._pane[0] = false;
            } else if (this._pane[1] === child) {
                this._pane[1] = false;
            } else {
                return;
            }

            if (child) {
                child.__container(null);
                child._parent = null;
            }
        },

        // Disconnects and prepares this widget for destruction.
        __destroy: function () {
            // Stop any animations.
            if (this._anim) {
                clearInterval(this._anim);
                this._anim = 0;
            }
            this.$bar.clearQueue();

            // Remove all registered events.
            while (this._boundEvents.length) {
                this._parent.off(this._boundEvents[0].event, this._boundEvents[0].handler);
                this._boundEvents.shift();
            }

            if (this._pane[0]) {
                this._pane[0].__destroy();
                this._pane[0] = null;
            }
            if (this._pane[1]) {
                this._pane[1].__destroy();
                this._pane[1] = null;
            }

            this.__container(null);
            this._parent = false;
        }
    });

    // window['wcSplitter'] = Module;

    return Module;
});

/**
 * A callback function that is called when an action is finished.
 *
 * @callback wcSplitter~onFinished
 */
