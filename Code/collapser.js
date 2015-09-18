/** @module wcCollapser */
define([
    "dcl/dcl",
    "./types",
    "./splitter",
    "./drawer",
    "./base"
], function (dcl, wcDocker, wcSplitter, wcDrawer, base) {

    /**
     * A collapsable container for carrying panels.<br>
     *
     * @class module:wcCollapser
     * @version 3.0.0
     * @description A docker container for carrying its own arrangement of docked panels as a slide out drawer.<br/>
     * <b><i>PRIVATE<i> - Handled internally by [docker]{@link module:wcDocker} and <u>should never be constructed by the user.</u></b>
     */
    var Module = dcl(base, {
        declaredClass:'wcCollapser',
        /**
         * @memberOf module:wcCollapser
         * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this drawer.
         * @param {module:wcSplitter|wcDocker} parent  - The drawer's parent object.
         * @param {module:wcDocker.DOCK} position      - A docking position to place this drawer.
         */
        constructor: function (container, parent, position) {

            this.$container = $(container);
            this.$frame = null;

            this._position = position;
            this._parent = parent;
            this._splitter = null;
            this._drawer = null;
            this._size = 0;
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
            this._drawer.collapse();
        },

        /**
         * Expands the drawer.
         */
        expand: function () {
            this._drawer.expand();
        },

        /**
         * Gets whether the drawer is expanded.
         *
         * @returns {Boolean} - The current expanded state.
         */
        isExpanded: function () {
            return this._drawer.isExpanded();
        },

        /**
         * The minimum size constraint for the side bar area.
         *
         * @returns {module:wcDocker~Size} - The minimum size.
         */
        minSize: function () {
            return {x: this._size, y: this._size};
        },

        /**
         * The maximum size constraint for the side bar area.
         *
         * @returns {module:wcDocker~Size} - The maximum size.
         */
        maxSize: function () {
            var isHorizontal = (this._orientation === wcDocker.ORIENTATION.HORIZONTAL) ? true : false;
            return {
                x: (isHorizontal ? this._size : Infinity),
                y: (!isHorizontal ? this._size : Infinity)
            };
        },

///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////
        __init: function () {
            this.$frame = $('<div class="wcCollapserFrame">');
            this.__container(this.$container);

            var docker = this.docker();
            this._splitter = new (this._getClass('wcSplitter'))(docker.$container, this, this._orientation);
            this._drawer = new (this._getClass('wcDrawer'))(docker.$transition, this._splitter, this._position);
            switch (this._position) {
                case wcDocker.DOCK.LEFT:
                    this._splitter.pane(0, this._drawer);
                    this._splitter.$pane[1].remove();
                    this._splitter.$pane[0].addClass('wcDrawer');
                    this._splitter.pos(0);
                    break;
                case wcDocker.DOCK.RIGHT:
                case wcDocker.DOCK.BOTTOM:
                    this._splitter.pane(1, this._drawer);
                    this._splitter.$pane[0].remove();
                    this._splitter.$pane[1].addClass('wcDrawer');
                    this._splitter.pos(1);
                    break;
            }

            this._parent.$bar.addClass('wcSplitterHidden');
        },

        // Updates the size of the collapser.
        __update: function (opt_dontMove) {
            this._splitter.__update();
            this.__adjustSize();
        },

        // Adjusts the size of the collapser based on css
        __adjustSize: function () {
            if (this._drawer._frame._panelList.length) {
                this._size = this._drawer._frame.$tabBar.outerHeight();
            } else {
                this._size = 0;
            }
        },

        // Retrieves the bounding rect for this collapser.
        __rect: function () {
            return this._drawer.__rect();
        },

        // Saves the current panel configuration into a meta
        // object that can be used later to restore it.
        __save: function () {
            var data = {};
            data.size = this._size;
            data.drawer = this._drawer.__save();
            return data;
        },

        // Restores a previously saved configuration.
        __restore: function (data, docker) {
            this._size = data.size;
            this._drawer.__restore(data.drawer, docker);
            this.__adjustSize();
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
            if (this._splitter) {
                this._splitter.__destroy();
                this._splitter = null;
                this._frame = null;
            }

            this.__container(null);
            this._parent = null;
        }
    });

    // window['wcCollapser'] = Module;

    return Module;

});
