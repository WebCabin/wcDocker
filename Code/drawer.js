/** @module wcDrawer */
define([
    "dcl/dcl",
    "./types",
    "./frame",
    "./base"
], function (dcl, wcDocker, wcFrame, base) {
    /**
     * A docker container for carrying its own arrangement of docked panels as a slide out drawer.
     * @class module:wcDrawer
     * A collapsable container for carrying panels.<br>
     *
     * @version 3.0.0
     * @description <b><i>PRIVATE<i> - Handled internally by [docker]{@link module:wcDocker} and <u>should never be constructed by the user.</u></b>
     */
    var Module = dcl(base,{
        declaredClass: 'wcDrawer',

        /**
         *
         * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this drawer.
         * @param {wcSplitter|wcDocker} parent  - The drawer's parent object.
         * @param {module:wcDocker.DOCK} position      - A docking position to place this drawer.
         */
        constructor:function (container, parent, position) {
            this.$container = $(container);
            this.$frame = null;

            this._position = position;
            this._parent = parent;
            this._frame = null;
            this._closeSize = 0;
            this._expanded = false;
            this._sliding = false;
            this._orientation = (this._position === wcDocker.DOCK.LEFT || this._position === wcDocker.DOCK.RIGHT) ? wcDocker.ORIENTATION.HORIZONTAL : wcDocker.ORIENTATION.VERTICAL;

            this.__init();
        },
        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        // Public Functions
        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        /**
         * Collapses the drawer to its respective side wall.
         */
        collapse: function (instant) {
            if (this._expanded) {
                // Collapse happens before the tab is de-selected, so record the
                // current size and assign it to the current panel.
                var panel = this._frame.panel();
                if (panel) {
                    var size = this._parent.pos();
                    if (this._position !== wcDocker.DOCK.LEFT) {
                        size = 1.0 - size;
                    }

                    var max;
                    if (this._position === wcDocker.DOCK.BOTTOM) {
                        max = this.docker().$container.height();
                        panel._size.y = size * max;
                    } else {
                        max = this.docker().$container.width();
                        panel._size.x = size * max;
                    }
                }

                this._expanded = false;
                if (instant) {
                    switch (this._position) {
                        case wcDocker.DOCK.TOP:
                        case wcDocker.DOCK.LEFT:
                            this._parent.pos(0);
                            break;
                        case wcDocker.DOCK.RIGHT:
                        case wcDocker.DOCK.BOTTOM:
                            this._parent.pos(1);
                            break;
                    }
                } else {
                    this._sliding = true;

                    var self = this;
                    var fin = function () {
                        self._sliding = false;
                        self._parent.__update();
                    };

                    switch (this._position) {
                        case wcDocker.DOCK.TOP:
                        case wcDocker.DOCK.LEFT:
                            this._parent.animPos(0, fin);
                            break;
                        case wcDocker.DOCK.RIGHT:
                        case wcDocker.DOCK.BOTTOM:
                            this._parent.animPos(1, fin);
                            break;
                    }
                }
            }
        },

        /**
         * Expands the drawer.
         */
        expand: function () {
            if (!this._expanded) {
                this._expanded = true;
                this._sliding = true;

                var panel = this._frame.panel();
                if (panel) {
                    // Determine the size to expand the drawer based on the size of the panel.
                    var size, max;
                    if (this._position === wcDocker.DOCK.BOTTOM) {
                        size = panel._size.y;
                        max = this.docker().$container.height();
                    } else {
                        size = panel._size.x;
                        max = this.docker().$container.width();
                    }

                    if (this._position !== wcDocker.DOCK.LEFT) {
                        size = max - size;
                    }

                    size = size / max;
                    var self = this;
                    this._parent.animPos(size, function () {
                        self._sliding = false;
                        self._parent.__update();
                    });
                }
            }
        },

        /**
         * Gets whether the drawer is expanded.
         *
         * @returns {Boolean} - The current expanded state.
         */
        isExpanded: function () {
            return this._expanded;
        },

        /**
         * The minimum size constraint for the drawer area.
         *
         * @returns {module:wcDocker~Size} - The minimum size.
         */
        minSize: function () {
            if (this._expanded) {
                if (this._root && typeof this._root.minSize === 'function') {
                    return this._root.minSize();
                } else {
                    return {x: 100, y: 100};
                }
            }
            this.__adjustCollapsedSize();
            return {x: this._closeSize, y: this._closeSize};
        },

        /**
         * The maximum size constraint for the drawer area.
         *
         * @returns {module:wcDocker~Size} - The maximum size.
         */
        maxSize: function () {
            var isHorizontal = (this._orientation === wcDocker.ORIENTATION.HORIZONTAL) ? true : false;
            if (this._expanded || this._sliding) {
                if (this._root && typeof this._root.maxSize === 'function') {
                    return {
                        x: (isHorizontal ? this._root.maxSize().x : Infinity),
                        y: (!isHorizontal ? this._root.maxSize().y : Infinity)
                    };
                } else {
                    return {x: Infinity, y: Infinity};
                }
            }
            this.__adjustCollapsedSize();
            return {
                x: (isHorizontal ? this._closeSize : Infinity),
                y: (!isHorizontal ? this._closeSize : Infinity)
            };
        },

///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////
        __init: function () {
            this.$frame = $('<div class="wcCollapserFrame">');
            this.__container(this.$container);

            this._frame = new (this.docker().__getClass('wcFrame'))(this.$frame, this, false);
            this._frame.tabOrientation(this._position);
        },

        // Updates the size of the collapser.
        __update: function (opt_dontMove) {
            this.__adjustCollapsedSize();
            this._frame.__update();
        },

        // Adjusts the size of the collapser when it is closed.
        __adjustCollapsedSize: function () {
            if (this._frame._panelList.length) {
                this._closeSize = this._frame.$tabBar.outerHeight();
                this._parent.$bar.removeClass('wcSplitterHidden');
            } else {
                this._closeSize = 0;
                this._parent.$bar.addClass('wcSplitterHidden');
            }
        },

        // Retrieves the bounding rect for this collapser.
        __rect: function () {
            var offset = this.$frame.offset();
            var width = this.$frame.width();
            var height = this.$frame.height();

            var panel = this._frame.panel();
            if (panel) {
                // Determine the size to expand the drawer based on the size of the panel.
                if (this._position === wcDocker.DOCK.BOTTOM) {
                    height = panel._size.y;
                    width = width / 3;
                } else {
                    width = panel._size.x;
                    height = height / 3;
                }
            }

            return {
                x: offset.left,
                y: offset.top,
                w: width,
                h: height
            };
        },

        // Saves the current panel configuration into a meta
        // object that can be used later to restore it.
        __save: function () {

            var data = {};
            data.closeSize = this._closeSize;
            data.frame = this._frame.__save();
            return data;
        },

        // Restores a previously saved configuration.
        __restore: function (data, docker) {
            this._closeSize = data.closeSize;
            this._frame.__restore(data.frame, docker);
            this.__adjustCollapsedSize();
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
                this.$container.append(this.$frame);
            } else {
                this.$frame.remove();
            }
            return this.$container;
        },

        // Disconnects and prepares this widget for destruction.
        __destroy: function () {
            if (this._frame) {
                this._frame.__destroy();
                this._frame = null;
            }

            this.__container(null);
            this._parent = null;
        }
    });

    // window['wcDrawer'] = Module;

    return Module;
});