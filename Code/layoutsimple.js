/**
 * @class
 * A simple layout for containing elements in a panel. [Panels]{@link wcPanel}, [splitter widgets]{@link wcSplitter}
 * and [tab widgets]{@link wcTabFrame} can optionally contain these instead of the default {@link wcLayoutTable}.
 *
 * @constructor
 * @description
 * <b><i>PRIVATE</i> - <u>This should never be constructed directly by the user</u></b>
 * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this layout.
 * @param {wcLayoutSimple|wcLayoutTable|wcSplitter|wcDocker} parent - The layout's parent object.
 */
function wcLayoutSimple(container, parent) {
    /**
     * The outer container element of the panel.
     *
     * @member {external:jQuery~Object}
     */
    this.$container = $(container);
    this._parent = parent;

    /**
     * The table DOM element for the layout.
     *
     * @member {external:jQuery~Object}
     */
    this.$elem = null;

    this.__init();
}
wcLayoutSimple.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Adds an item into the layout, appending it to the main element.
     *
     * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} item - A DOM element to add.
     */
    addItem: function (item) {
        this.$elem.append(item);
    },

    /**
     * Clears the contents of the layout and squashes all rows
     * and columns from the grid.
     */
    clear: function () {
        this.$elem.remove();
        this.$elem = null;
        this.__init();
    },

    /**
     * Retrieves the main element.
     * @returns {external:jQuery~Object} - The div item that makes this layout scene.
     */
    scene: function () {
        return this.$elem;
    },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

    // Initialize
    __init: function () {
        this.$elem = $('<div class="wcLayout wcWide wcTall"></div>');
        this.__container(this.$container);
    },

    // Updates the size of the layout.
    __update: function () {
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
        if (this._parent instanceof wcPanel && this._parent._isPlaceholder) {
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
            this.$container.append(this.$elem);
        } else {
            this.$elem.remove();
        }
        return this.$container;
    },

    // Destroys the layout.
    __destroy: function () {
        this.__container(null);
        this._parent = null;
        this.clear();

        this.$elem.remove();
        this.$elem = null;
    }
};