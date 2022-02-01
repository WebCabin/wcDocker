/** @module wcFrame */
define([
    "dcl/dcl",
    "./types",
    "./base"
], function (dcl, wcDocker, base) {

    /**
     * @class module:wcFrame
     * The frame is a [panel]{@link module:wcPanel} container.
     * Each panel appears as a tabbed item inside a frame.
     */
    var Module = dcl(base, {
        declaredClass: 'wcFrame',

        LEFT_TAB_BUFFER: 15,

        /**
         * <b><i>PRIVATE<i> - Handled internally by [docker]{@link module:wcDocker} and <u>should never be constructed by the user.</u></b>
         * @memberOf module:wcFrame
         * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this frame.
         * @param {module:wcSplitter|wcDocker} parent - The frames parent object.
         * @param {Boolean} isFloating - If true, the frame will be a floating window.
         */
        constructor: function (container, parent, isFloating) {
            /**
             * The container that holds the frame.
             * @member {external:jQuery~Object}
             */
            this.$container = $(container);
            this._parent = parent;
            this._isFloating = isFloating;

            /**
             * The outer frame element.
             * @member {external:jQuery~Object}
             */
            this.$frame = null;
            this.$title = null;
            this.$titleBar = null;
            this.$tabBar = null;
            this.$tabScroll = null;
            this.$center = null;
            this.$tabLeft = null;
            this.$tabRight = null;
            this.$close = null;
            this.$collapse = null;
            this.$top = null;
            this.$bottom = null;
            this.$left = null;
            this.$right = null;
            this.$corner1 = null;
            this.$corner2 = null;
            this.$corner3 = null;
            this.$corner4 = null;
            this.$buttonBar = null;

            this.$shadower = null;
            this.$modalBlocker = null;

            this._titleVisible = true;
            this._canScrollTabs = false;
            this._tabOrientation = wcDocker.TAB.TOP;
            this._tabScrollPos = 0;
            this._curTab = -1;
            this._panelList = [];
            this._buttonList = [];

            this._resizeData = {
                time: -1,
                timeout: false,
                delta: 150
            };

            this._pos = {
                x: 0.5,
                y: 0.5
            };

            this._size = {
                x: 400,
                y: 400
            };

            this._lastSize = {
                x: 400,
                y: 400
            };

            this._anchorMouse = {
                x: 0,
                y: 0
            };

            this.__init();
        },

        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        // Public Functions
        ///////////////////////////////////////////////////////////////////////////////////////////////////////

        /**
         * Gets, or Sets the position of the frame.
         * @function module:wcFrame#pos
         * @param {Number} [x]        - If supplied, assigns a new horizontal position.
         * @param {Number} [y]        - If supplied, assigns a new vertical position.
         * @param {Boolean} [pixels]  - If true, the coordinates passed in will be treated as a pixel position rather than a percentage.
         * @returns {module:wcDocker~Coordinate} - The current position of the frame. If the pixel parameter was true, the position will be in pixels.
         */
        pos: function (x, y, pixels) {
            var width = this.$container.width();
            var height = this.$container.height();

            if (typeof x === 'undefined') {
                if (pixels) {
                    return {x: this._pos.x * width, y: this._pos.y * height};
                } else {
                    return {x: this._pos.x, y: this._pos.y};
                }
            }

            if (pixels) {
                this._pos.x = x / width;
                this._pos.y = y / height;
            } else {
                this._pos.x = x;
                this._pos.y = y;
            }
        },

        /**
         * Gets the initially desired size of the panel.
         * @function module:wcFrame#initSize
         * @returns {module:wcDocker~Size} - The initially desired size.
         */
        initSize: function () {
            var size = {
                x: -1,
                y: -1
            };

            for (var i = 0; i < this._panelList.length; ++i) {
                if (size.x < this._panelList[i].initSize().x) {
                    size.x = this._panelList[i].initSize().x;
                }
                if (size.y < this._panelList[i].initSize().y) {
                    size.y = this._panelList[i].initSize().y;
                }
            }

            if (size.x < 0 || size.y < 0) {
                return false;
            }
            return size;
        },

        /**
         * Gets the minimum size of the frame.
         * @function module:wcFrame#minSize
         * @returns {module:wcDocker~Size} - The minimum size of the frame.
         */
        minSize: function () {
            var size = {
                x: 0,
                y: 0
            };

            for (var i = 0; i < this._panelList.length; ++i) {
                size.x = Math.max(size.x, this._panelList[i].minSize().x);
                size.y = Math.max(size.y, this._panelList[i].minSize().y);
            }
            return size;
        },

        /**
         * Gets the maximum size of the frame.
         * @function module:wcFrame#maxSize
         * @returns {module:wcDocker~Size} - The maximum size of the frame.
         */
        maxSize: function () {
            var size = {
                x: Infinity,
                y: Infinity
            };

            for (var i = 0; i < this._panelList.length; ++i) {
                size.x = Math.min(size.x, this._panelList[i].maxSize().x);
                size.y = Math.min(size.y, this._panelList[i].maxSize().y);
            }
            return size;
        },

        /**
         * Gets, or Sets the tab orientation for the frame. This puts the tabbed widgets visually on any side of the frame.
         * @version 3.0.0
         * @function module:wcFrame#tabOrientation
         * @param {module:wcDocker.TAB} [orientation] - Assigns the orientation of the tab items displayed.
         * @returns {module:wcDocker.TAB} - The current orientation.
         */
        tabOrientation: function (orientation) {
            if (orientation !== undefined) {
                if (this._tabOrientation !== orientation && this.docker()._canOrientTabs) {
                    this._tabOrientation = orientation;

                    this.__updateTabs();
                    this.__updateTabs();
                }
            }

            return this._tabOrientation
        },

        /**
         * Adds a given panel as a new tab item to the frame.
         * @function module:wcFrame#addPanel
         * @param {module:wcPanel} panel         - The panel to add.
         * @param {Number} [index]        - Insert index.
         */
        addPanel: function (panel, index) {
            var found = this._panelList.indexOf(panel);
            if (found !== -1) {
                this._panelList.splice(found, 1);
            }

            if (typeof index === 'undefined') {
                this._panelList.push(panel);
            } else {
                this._panelList.splice(index, 0, panel);
            }

            if (this._curTab === -1 && this._panelList.length) {
                if (!this.isCollapser()) {
                    this._curTab = 0;
                }
                this._size = this.initSize();
            }

            this.__updateTabs();
        },

        /**
         * Removes a given panel from the frame.
         * @function module:wcFrame#removePanel
         * @param {module:wcPanel} panel - The panel to remove.
         * @returns {Boolean} - True if any panels still remain after the removal.
         */
        removePanel: function (panel) {
            for (var i = 0; i < this._panelList.length; ++i) {
                if (this._panelList[i] === panel) {
                    if (this.isCollapser()) {
                        this._curTab = -1;
                    } else if (this._curTab >= i) {
                        this._curTab--;
                    }

                    // Only null out the container if it is still attached to this frame.
                    if (this._panelList[i]._parent === this) {
                        this._panelList[i].__container(null);
                        this._panelList[i]._parent = null;
                    }

                    this._panelList.splice(i, 1);
                    panel._isVisible = false;
                    break;
                }
            }

            if (this._curTab === -1) {
                if (!this.collapse() && this._panelList.length) {
                    this._curTab = 0;
                }
            }

            this.__updateTabs();
            return this._panelList.length > 0;
        },

        /**
         * Gets, or Sets the currently visible panel.
         * @function module:wcFrame#panel
         * @param {Number} [tabIndex] - If supplied, sets the current panel index.
         * @param {Boolean} [autoFocus] - If true, this tab will be focused (brought to front).
         * @returns {module:wcPanel} - The currently visible panel.
         */
        panel: function (tabIndex, autoFocus) {
            if (typeof tabIndex !== 'undefined') {
                if (this.isCollapser() && tabIndex === this._curTab) {
                    this.collapse();
                    tabIndex = -1;
                }
                if (tabIndex < this._panelList.length) {
                    this.$tabBar.find('> .wcTabScroller > .wcPanelTab[id="' + this._curTab + '"]').removeClass('wcPanelTabActive');
                    this.$center.children('.wcPanelTabContent[id="' + this._curTab + '"]').addClass('wcPanelTabContentHidden');
                    if (this._curTab !== tabIndex) {
                        this.collapse();
                    }
                    this._curTab = tabIndex;
                    if (tabIndex > -1) {
                        this.$tabBar.find('> .wcTabScroller > .wcPanelTab[id="' + tabIndex + '"]').addClass('wcPanelTabActive');
                        this.$center.children('.wcPanelTabContent[id="' + tabIndex + '"]').removeClass('wcPanelTabContentHidden');
                        this.expand();
                    }
                    this.__updateTabs(autoFocus);
                }
            }

            if (this._curTab > -1 && this._curTab < this._panelList.length) {
                return this._panelList[this._curTab];
            } else if (this.isCollapser() && this._panelList.length) {
                return this._panelList[0];
            }
            return false;
        },

        /**
         * Gets whether this frame is inside a collapser.
         * @function module:wcFrame#isCollapser
         * @returns {Boolean} - Whether this frame is inside a collapser.
         */
        isCollapser: function () {
            return (this._parent && this._parent.declaredClass === 'wcDrawer');
        },

        /**
         * Collapses the frame, if it is a collapser.
         * @function module:wcFrame#collapse
         * @param {Boolean} [instant] - If true, collapses without animating.
         */
        collapse: function (instant) {
            if (this.isCollapser()) {
                this._parent.collapse(instant);
                return true;
            }
            return false;
        },

        /**
         * Expands the frame, if it is a collapser.
         * @function module:wcFrame#expand
         */
        expand: function () {
            if (this.isCollapser()) {
                this._parent.expand();
                return true;
            }
            return false;
        },

        /**
         * Gets whether the frame is expanded, if it is a collapser.
         * @function module:wcFrame#isExpanded
         * @returns {Boolean|undefined} - The current expanded state, or undefined if it is not a collapser.
         */
        isExpanded: function () {
            if (this.isCollapser()) {
                return this._parent.isExpanded();
            }
        },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

        // Initialize
        __init: function () {
            this.$frame = $('<div class="wcFrame wcWide wcTall">');
            this.$title = $('<div class="wcFrameTitle">');
            this.$titleBar = $('<div class="wcFrameTitleBar wcFrameTopper">');
            this.$tabBar = $('<div class="wcFrameTitleBar">');
            this.$tabScroll = $('<div class="wcTabScroller">');
            this.$center = $('<div class="wcFrameCenter wcPanelBackground">');
            this.$tabLeft = $('<div class="wcFrameButton" title="Scroll tabs to the left."><span class="fa fa-arrow-left"></span>&lt;</div>');
            this.$tabRight = $('<div class="wcFrameButton" title="Scroll tabs to the right."><span class="fa fa-arrow-right"></span>&gt;</div>');
            this.$close = $('<div class="wcFrameButton" title="Close the currently active panel tab"><div class="fa fa-close"></div>X</div>');

            this.$collapse = $('<div class="wcFrameButton" title="Collapse the active panel"><div class="fa fa-download"></div>C</div>');
            this.$buttonBar = $('<div class="wcFrameButtonBar">');
            this.$tabButtonBar = $('<div class="wcFrameButtonBar">');

            this.$tabBar.append(this.$tabScroll);
            this.$tabBar.append(this.$tabButtonBar);
            this.$frame.append(this.$buttonBar);
            this.$buttonBar.append(this.$close);
            this.$buttonBar.append(this.$collapse);
            this.$frame.append(this.$center);

            if (this._isFloating) {
                this.$top = $('<div class="wcFrameEdgeH wcFrameEdge"></div>').css('top', '-6px').css('left', '0px').css('right', '0px');
                this.$bottom = $('<div class="wcFrameEdgeH wcFrameEdge"></div>').css('bottom', '-6px').css('left', '0px').css('right', '0px');
                this.$left = $('<div class="wcFrameEdgeV wcFrameEdge"></div>').css('left', '-6px').css('top', '0px').css('bottom', '0px');
                this.$right = $('<div class="wcFrameEdgeV wcFrameEdge"></div>').css('right', '-6px').css('top', '0px').css('bottom', '0px');
                this.$corner1 = $('<div class="wcFrameCornerNW wcFrameEdge"></div>').css('top', '-6px').css('left', '-6px');
                this.$corner2 = $('<div class="wcFrameCornerNE wcFrameEdge"></div>').css('top', '-6px').css('right', '-6px');
                this.$corner3 = $('<div class="wcFrameCornerNW wcFrameEdge"></div>').css('bottom', '-6px').css('right', '-6px');
                this.$corner4 = $('<div class="wcFrameCornerNE wcFrameEdge"></div>').css('bottom', '-6px').css('left', '-6px');

                this.$frame.append(this.$top);
                this.$frame.append(this.$bottom);
                this.$frame.append(this.$left);
                this.$frame.append(this.$right);
                this.$frame.append(this.$corner1);
                this.$frame.append(this.$corner2);
                this.$frame.append(this.$corner3);
                this.$frame.append(this.$corner4);
            }

            this.__container(this.$container);

            if (this._isFloating) {
                this.$frame.addClass('wcFloating');
            }

            this.$center.on('scroll',this.__scrolled.bind(this));
        },

        // Updates the size of the frame.
        __update: function () {
            var width = this.$container.width();
            var height = this.$container.height();

            // Floating windows manage their own sizing.
            if (this._isFloating) {
                var left = (this._pos.x * width) - this._size.x / 2;
                var top = (this._pos.y * height) - this._size.y / 2;

                if (top < 0) {
                    top = 0;
                }

                if (left + this._size.x / 2 < 0) {
                    left = -this._size.x / 2;
                }

                if (left + this._size.x / 2 > width) {
                    left = width - this._size.x / 2;
                }

                if (top + parseInt(this.$center.css('top')) > height) {
                    top = height - parseInt(this.$center.css('top'));
                }

                this.$frame.css('left', left + 'px');
                this.$frame.css('top', top + 'px');
                this.$frame.css('width', this._size.x + 'px');
                this.$frame.css('height', this._size.y + 'px');
            }

            if (width !== this._lastSize.x || height !== this._lastSize.y) {
                this._lastSize.x = width;
                this._lastSize.y = height;

                this._resizeData.time = new Date();
                if (!this._resizeData.timeout) {
                    this._resizeData.timeout = true;
                    setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
                }
            }
            // this.__updateTabs();
            this.__onTabChange();
        },

        __resizeEnd: function () {
            this.__updateTabs();
            if (new Date() - this._resizeData.time < this._resizeData.delta) {
                setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
            } else {
                this._resizeData.timeout = false;
            }
        },

        // Triggers an event exclusively on the docker and none of its panels.
        // Params:
        //    eventName   The name of the event.
        //    data        A custom data parameter to pass to all handlers.
        __trigger: function (eventName, data) {
            for (var i = 0; i < this._panelList.length; ++i) {
                this._panelList[i].__trigger(eventName, data);
            }
        },

        // Saves the current panel configuration into a meta
        // object that can be used later to restore it.
        __save: function () {
            var data = {};
            data.type = 'wcFrame';
            data.floating = this._isFloating;
            data.isFocus = this.$frame.hasClass('wcFloatingFocus');
            data.tabOrientation = this._tabOrientation;
            data.pos = {
                x: this._pos.x,
                y: this._pos.y
            };
            data.size = {
                x: this._size.x,
                y: this._size.y
            };
            data.tab = this._curTab;
            data.panels = [];
            for (var i = 0; i < this._panelList.length; ++i) {
                data.panels.push(this._panelList[i].__save());
            }
            return data;
        },

        // Restores a previously saved configuration.
        __restore: function (data, docker) {
            this._isFloating = data.floating;
            this._tabOrientation = data.tabOrientation || wcDocker.TAB.TOP;
            this._pos.x = data.pos.x;
            this._pos.y = data.pos.y;
            this._size.x = data.size.x;
            this._size.y = data.size.y;
            this._curTab = data.tab;
            for (var i = 0; i < data.panels.length; ++i) {
                var panel = docker.__create(data.panels[i], this, this.$center);
                panel.__restore(data.panels[i], docker);
                this._panelList.push(panel);
            }

            this.__update();

            if (data.isFocus) {
                this.$frame.addClass('wcFloatingFocus');
            }
        },

        __updateTabs: function (autoFocus) {
            this.$tabScroll.empty();

            var getOffset = function ($item) {
                switch (this._tabOrientation) {
                    case wcDocker.TAB.BOTTOM:
                        return $item.offset().left;
                    case wcDocker.TAB.TOP:
                        return $item.offset().left;
                    case wcDocker.TAB.LEFT:
                        return $item.offset().top;
                    case wcDocker.TAB.RIGHT:
                        return $item.offset().top;
                }
            }.bind(this);

            var visibilityChanged = [];
            var tabPositions = [];
            var totalWidth = 0;
            var parentLeft = getOffset(this.$tabScroll);
            var showTabs = this._panelList.length > 1 || this._isFloating || this.isCollapser();
            var self = this;

            if (this.isCollapser()) {
                // this.$titleBar.addClass('wcNotMoveable');
                this.$tabBar.addClass('wcNotMoveable');
            } else {
                this.$titleBar.removeClass('wcNotMoveable');
                this.$tabBar.removeClass('wcNotMoveable');
            }

            this.$center.children('.wcPanelTabContent').each(function () {
                $(this).addClass('wcPanelTabContentHidden wcPanelTabUnused');
            });

            this._titleVisible = true;
            this.$title.html('');

            // Determine if the title and tabs are visible based on the panels inside.
            for (var i = 0; i < this._panelList.length; ++i) {
                var panel = this._panelList[i];

                var $tab = null;
                if (showTabs) {
                    $tab = panel.$title;
                    panel.$title.attr('id', i);
                    this.$tabScroll.append(panel.$title);
                }

                if (!panel.moveable()) {
                    this.$titleBar.addClass('wcNotMoveable');
                    this.$tabBar.addClass('wcNotMoveable');
                }

                if (!panel._titleVisible) {
                    this._titleVisible = false;
                }

                var $tabContent = this.$center.children('.wcPanelTabContent[id="' + i + '"]');
                if (!$tabContent.length) {
                    $tabContent = $('<div class="wcPanelTabContent wcPanelTabContentHidden" id="' + i + '">');
                    this.$center.append($tabContent);
                }

                panel.__container($tabContent);
                panel._parent = this;

                var isVisible = this._curTab === i;
                if (panel.isVisible() !== isVisible) {
                    visibilityChanged.push({
                        panel: panel,
                        isVisible: isVisible
                    });
                }

                $tabContent.removeClass('wcPanelTabUnused');

                if (isVisible) {
                    $tab && $tab.addClass('wcPanelTabActive');
                    $tabContent.removeClass('wcPanelTabContentHidden');
                    this.$title.html(panel.title());
                    if (panel.$icon) {
                        var $icon = panel.$icon.clone();
                        this.$title.prepend($icon);
                    }
                }

                if ($tab) {
                    totalWidth = getOffset($tab) - parentLeft;
                    tabPositions.push(totalWidth);

                    totalWidth += $tab.outerWidth();
                }
            }

            var $topBar = this.$titleBar;
            var tabWidth = 0;
            if (this._titleVisible) {
                if (!this.$frame.parent()) {
                    this.$center.css('top', '');
                }
                switch (this._tabOrientation) {
                    case wcDocker.TAB.TOP:
                        this.$frame.prepend(this.$tabBar);
                        this.$titleBar.remove();
                        this.$tabBar.addClass('wcTabTop').removeClass('wcTabLeft wcTabRight wcTabBottom');
                        // this.$tabBar.css('margin-top', '');
                        if (showTabs) {
                            this.$title.remove();
                        } else {
                            this.$tabBar.prepend(this.$title);
                        }
                        $topBar = this.$tabBar;
                        this.$center.css('left', 0).css('right', 0).css('bottom', 0);
                        tabWidth = this.$center.width();
                        break;
                    case wcDocker.TAB.BOTTOM:
                        this.$frame.prepend(this.$titleBar);
                        this.$titleBar.append(this.$title);

                        if (showTabs) {
                            var titleSize = this.$titleBar.height();
                            this.$frame.append(this.$tabBar);
                            this.$tabBar.addClass('wcTabBottom').removeClass('wcTabTop wcTabLeft wcTabRight');
                            // this.$tabBar.css('margin-top', '');

                            this.$center.css('left', 0).css('right', 0).css('bottom', titleSize);
                        } else {
                            this.$tabBar.remove();
                        }
                        tabWidth = this.$center.width();
                        break;

                    case wcDocker.TAB.LEFT:
                        this.$frame.prepend(this.$titleBar);
                        this.$titleBar.append(this.$title);

                        if (showTabs) {
                            var titleSize = this.$titleBar.height();
                            this.$frame.append(this.$tabBar);
                            this.$tabBar.addClass('wcTabLeft').removeClass('wcTabTop wcTabRight wcTabBottom');
                            // this.$tabBar.css('margin-top', titleSize);

                            this.$center.css('left', titleSize).css('right', 0).css('bottom', 0);
                        } else {
                            this.$tabBar.remove();
                        }
                        tabWidth = this.$center.height();
                        break;

                    case wcDocker.TAB.RIGHT:
                        this.$frame.prepend(this.$titleBar);
                        this.$titleBar.append(this.$title);

                        if (showTabs) {
                            var titleSize = this.$titleBar.height();
                            this.$frame.append(this.$tabBar);
                            this.$tabBar.addClass('wcTabRight').removeClass('wcTabTop wcTabLeft wcTabBottom');
                            // this.$tabBar.css('margin-top', titleSize);

                            this.$center.css('left', 0).css('right', titleSize).css('bottom', 0);
                        } else {
                            this.$tabBar.remove();
                        }
                        tabWidth = this.$center.height();
                        break;
                }
                if (!showTabs) {
                    this.$center.css('left', 0).css('right', 0).css('bottom', 0);
                }
            } else {
                this.$titleBar.remove();
                this.$tabBar.remove();
                this.$center.css('top', 0).css('left', 0).css('right', 0).css('bottom', 0);
            }

            // Now remove all unused panel tabs.
            this.$center.children('.wcPanelTabUnused').each(function () {
                $(this).remove();
            });

            if (this._titleVisible) {
                var buttonSize = this.__onTabChange();

                if (autoFocus) {
                    for (var i = 0; i < tabPositions.length; ++i) {
                        if (i === this._curTab) {
                            var left = tabPositions[i];
                            var right = totalWidth;
                            if (i + 1 < tabPositions.length) {
                                right = tabPositions[i + 1];
                            }

                            var scrollPos = -parseInt(this.$tabScroll.css('left'));
                            var titleWidth = tabWidth - buttonSize;

                            // If the tab is behind the current scroll position.
                            if (left < scrollPos) {
                                this._tabScrollPos = left - this.LEFT_TAB_BUFFER;
                                if (this._tabScrollPos < 0) {
                                    this._tabScrollPos = 0;
                                }
                            }
                            // If the tab is beyond the current scroll position.
                            else if (right - scrollPos > titleWidth) {
                                this._tabScrollPos = right - titleWidth + this.LEFT_TAB_BUFFER;
                            }
                            break;
                        }
                    }
                }

                this._canScrollTabs = false;
                if (totalWidth > tabWidth - buttonSize) {
                    this._canScrollTabs = this._titleVisible;
                    if (this._canScrollTabs) {
                        this.$tabButtonBar.append(this.$tabRight);
                        this.$tabButtonBar.append(this.$tabLeft);
                        buttonSize += this.$tabRight.outerWidth();
                        buttonSize += this.$tabLeft.outerWidth();
                    }

                    var scrollLimit = totalWidth - (tabWidth - buttonSize) / 2;
                    // If we are beyond our scroll limit, clamp it.
                    if (this._tabScrollPos > scrollLimit) {
                        var children = this.$tabScroll.children();
                        for (var i = 0; i < children.length; ++i) {
                            var $tab = $(children[i]);

                            totalWidth = getOffset($tab) - parentLeft;
                            if (totalWidth + $tab.outerWidth() > scrollLimit) {
                                this._tabScrollPos = totalWidth - this.LEFT_TAB_BUFFER;
                                if (this._tabScrollPos < 0) {
                                    this._tabScrollPos = 0;
                                }
                                break;
                            }
                        }
                    }
                } else {
                    this._tabScrollPos = 0;
                    this.$tabLeft.remove();
                    this.$tabRight.remove();
                }

                this.$tabScroll.stop().animate({left: -this._tabScrollPos + 'px'}, 'fast');

                // Update visibility on panels.
                for (var i = 0; i < visibilityChanged.length; ++i) {
                    visibilityChanged[i].panel.__isVisible(visibilityChanged[i].isVisible);
                }
            }
        },

        __onTabChange: function () {
            var buttonSize = 0;
            var tabButtonSize = 0;
            var panel = this.panel();

            this.$tabLeft.remove();
            this.$tabRight.remove();
            this.$close.hide();
            this.$collapse.hide();

            while (this._buttonList.length) {
                this._buttonList.pop().remove();
            }

            if (panel) {
                var scrollable = panel.scrollable();
                this.$center.toggleClass('wcScrollableX', scrollable.x);
                this.$center.toggleClass('wcScrollableY', scrollable.y);
                this.$frame.toggleClass('wcOverflowVisible', panel.overflowVisible());
                this.$center.toggleClass('wcOverflowVisible', panel.overflowVisible());

                if (!this.isCollapser() || this.isExpanded()) {
                    if (panel.closeable()) {
                        this.$close.show();
                        buttonSize += this.$close.outerWidth();
                    }

                    var docker = this.docker();
                    if (docker.isCollapseEnabled() && panel.moveable() && panel.collapsible() && !this._isFloating && !panel._isPlaceholder) {
                        if (this.isCollapser()) {
                            // Un-collapse
                            var $icon = this.$collapse.children('div');
                            $icon[0].className = 'fa fa-sign-out';
                            switch (this._parent._position) {
                                case wcDocker.DOCK.LEFT:
                                    $icon.addClass('wcCollapseLeft');
                                    break;
                                case wcDocker.DOCK.RIGHT:
                                    $icon.addClass('wcCollapseRight');
                                    break;
                                case wcDocker.DOCK.BOTTOM:
                                    $icon.addClass('wcCollapseBottom');
                                    break;
                            }
                            $icon.addClass('wcCollapsed');
                            this.$collapse.show();
                            this.$collapse.attr('title', 'Dock this collapsed panel back into the main layout.');
                            buttonSize += this.$collapse.outerWidth();
                        } else {
                            var direction = wcDocker.DOCK.BOTTOM;
                            if (panel._collapseDirection === wcDocker.DOCK.LEFT ||
                                panel._collapseDirection === wcDocker.DOCK.RIGHT ||
                                panel._collapseDirection === wcDocker.DOCK.BOTTOM) {
                                // Static collapse direction.
                                direction = panel._collapseDirection;
                            } else {
                                // Determine the direction to collapse based on the frame center.
                                var $inner = docker.$container;
                                if (!$.isEmptyObject(docker._collapser) && docker._collapser.hasOwnProperty(wcDocker.DOCK.RIGHT)) {
                                    // Get the inner contents element not taken up by the collapsible drawers.
                                    $inner = docker._collapser[wcDocker.DOCK.RIGHT]._parent.$pane[0];
                                }

                                var outer = $inner.offset();
                                var bounds = this.$container.offset();
                                bounds.right = (bounds.left + this.$container.width() - outer.left) / $inner.width();
                                bounds.bottom = (bounds.top + this.$container.height() - outer.top) / $inner.height();
                                bounds.top = (bounds.top - outer.top) / $inner.height();
                                bounds.left = (bounds.left - outer.left) / $inner.width();

                                if (typeof panel._collapseDirection === 'function') {
                                    // Custom collapse handler.
                                    direction = panel._collapseDirection(bounds);
                                } else {
                                    // Default collapse calculation.
                                    if (bounds.top > 0.5 && bounds.bottom > 0.95) {
                                        direction = wcDocker.DOCK.BOTTOM;
                                    } else if (bounds.left <= 0.05) {
                                        direction = wcDocker.DOCK.LEFT;
                                    } else if (bounds.right >= 0.95) {
                                        direction = wcDocker.DOCK.RIGHT;
                                    } else if (bounds.bottom > 0.95) {
                                        direction = wcDocker.DOCK.BOTTOM;
                                    }
                                }
                            }

                            var directionLabel = '';
                            var directionClass = '';
                            switch (direction) {
                                case wcDocker.DOCK.LEFT:
                                    directionLabel = 'left side.';
                                    directionClass = 'wcCollapseLeft';
                                    break;
                                case wcDocker.DOCK.RIGHT:
                                    directionLabel = 'right side.';
                                    directionClass = 'wcCollapseRight';
                                    break;
                                case wcDocker.DOCK.BOTTOM:
                                    directionLabel = 'bottom.';
                                    directionClass = 'wcCollapseBottom';
                                    break;
                            }

                            if (directionLabel) {
                                var $icon = this.$collapse.children('div');
                                $icon[0].className = 'fa fa-sign-in';
                                $icon.addClass(directionClass);
                                $icon.addClass('wcCollapsible');
                                this.$collapse.show();
                                this.$collapse.attr('title', 'Collapse this panel into the ' + directionLabel);
                                buttonSize += this.$collapse.outerWidth();
                            }
                        }
                    }

                    for (var i = 0; i < panel._buttonList.length; ++i) {
                        var buttonData = panel._buttonList[i];
                        var $button = $('<div>');
                        var buttonClass = buttonData.className;
                        $button.addClass('wcFrameButton');
                        if (buttonData.isTogglable) {
                            $button.addClass('wcFrameButtonToggler');

                            if (buttonData.isToggled) {
                                $button.addClass('wcFrameButtonToggled');
                                buttonClass = buttonData.toggleClassName || buttonClass;
                            }
                        }
                        $button.attr('title', buttonData.tip);
                        $button.data('name', buttonData.name);
                        $button.text(buttonData.text);
                        if (buttonClass) {
                            $button.prepend($('<div class="' + buttonClass + '">'));
                        }

                        this._buttonList.push($button);
                        this.$buttonBar.append($button);
                        buttonSize += $button.outerWidth();
                    }
                }

                if (this._canScrollTabs) {
                    this.$tabButtonBar.append(this.$tabRight);
                    this.$tabButtonBar.append(this.$tabLeft);

                    tabButtonSize += this.$tabRight.outerWidth() + this.$tabLeft.outerWidth();
                }

                if (this._titleVisible) {
                    this.$buttonBar.css('right', '');
                    switch (this._tabOrientation) {
                        case wcDocker.TAB.RIGHT:
                            this.$buttonBar.css('right', this.$tabBar.height());
                        case wcDocker.TAB.LEFT:
                            this.$tabBar.css('width', this.$center.height() + this.$tabBar.height());
                            break;
                        case wcDocker.TAB.TOP:
                        case wcDocker.TAB.BOTTOM:
                            this.$tabBar.css('width', this.$center.width());
                            break;
                        default:
                            break;
                    }
                }

                panel.__update();

                this.$center.scrollLeft(panel._scroll.x);
                this.$center.scrollTop(panel._scroll.y);
            }

            this.$buttonBar.css('min-width', buttonSize).css('width', buttonSize);
            this.$tabButtonBar.css('min-width', tabButtonSize).css('width', tabButtonSize);

            if (this._tabOrientation === wcDocker.TAB.TOP) {
                this.$tabButtonBar.css('right', buttonSize);
                return buttonSize + tabButtonSize;
            } else {
                this.$tabButtonBar.css('right', 0);
                return tabButtonSize;
            }
        },

        // Handles scroll notifications.
        __scrolled: function () {
            var panel = this.panel();
            panel._scroll.x = this.$center.scrollLeft();
            panel._scroll.y = this.$center.scrollTop();

            panel.__trigger(wcDocker.EVENT.SCROLLED);
        },

        // Brings the frame into focus.
        // Params:
        //    flash     Optional, if true will flash the window.
        __focus: function (flash) {
            if (flash) {
                var $flasher = $('<div class="wcFrameFlasher">');
                this.$frame.append($flasher);
                $flasher.animate({
                    opacity: 1
                }, 100)
                    .animate({
                        opacity: 0.0
                    }, 100)
                    .animate({
                        opacity: 0.6
                    }, 50)
                    .animate({
                        opacity: 0.0
                    }, 50)
                    .queue(function (next) {
                        $flasher.remove();
                        next();
                    });
            }
        },

        // Moves the panel based on mouse dragging.
        // Params:
        //    mouse     The current mouse position.
        __move: function (mouse) {
            var width = this.$container.width();
            var height = this.$container.height();

            this._pos.x = (mouse.x + this._anchorMouse.x) / width;
            this._pos.y = (mouse.y + this._anchorMouse.y) / height;
        },

        // Sets the anchor position for moving the panel.
        // Params:
        //    mouse     The current mouse position.
        __anchorMove: function (mouse) {
            var width = this.$container.width();
            var height = this.$container.height();

            this._anchorMouse.x = (this._pos.x * width) - mouse.x;
            this._anchorMouse.y = (this._pos.y * height) - mouse.y;
        },

        // Moves a tab from a given index to another index.
        // Params:
        //    fromIndex     The current tab index to move.
        //    toIndex       The new index to move to.
        // Returns:
        //    element       The new element of the moved tab.
        //    false         If an error occurred.
        __tabMove: function (fromIndex, toIndex) {
            if (fromIndex >= 0 && fromIndex < this._panelList.length &&
                toIndex >= 0 && toIndex < this._panelList.length) {
                var panel = this._panelList.splice(fromIndex, 1);
                this._panelList.splice(toIndex, 0, panel[0]);

                // Preserve the currently active tab.
                if (this._curTab === fromIndex) {
                    this._curTab = toIndex;
                }

                this.__updateTabs();

                return this.$tabBar.find('> .wcTabScroller > .wcPanelTab[id="' + toIndex + '"]')[0];
            }
            return false;
        },

        // Checks if the mouse is in a valid anchor position for docking a panel.
        // Params:
        //    mouse       The current mouse position.
        //    same        Whether the moving frame and this one are the same.
        //    ghost       The ghost object.
        //    canSplit    Whether the frame can be split
        //    isTopper    Whether the user is dragging the topper (top title bar).
        //    allowEdges  Whether to allow edge docking.
        __checkAnchorDrop: function (mouse, same, ghost, canSplit, isTopper, allowEdges) {
            var panel = this.panel();
            if (panel && panel.moveable()) {
                return panel.layout().__checkAnchorDrop(mouse, same && this._tabOrientation, ghost, (!this._isFloating && !this.isCollapser() && canSplit), this.$frame, panel.moveable() && panel.title(), isTopper, this.isCollapser() ? this._tabOrientation : undefined, allowEdges);
            }
            return false;
        },

        // Resizes the panel based on mouse dragging.
        // Params:
        //    edges     A list of edges being moved.
        //    mouse     The current mouse position.
        __resize: function (edges, mouse) {
            var width = this.$container.width();
            var height = this.$container.height();
            var offset = this.$container.offset();

            mouse.x -= offset.left;
            mouse.y -= offset.top;

            var minSize = this.minSize();
            var maxSize = this.maxSize();

            var pos = {
                x: (this._pos.x * width) - this._size.x / 2,
                y: (this._pos.y * height) - this._size.y / 2
            };

            for (var i = 0; i < edges.length; ++i) {
                switch (edges[i]) {
                    case 'top':
                        this._size.y += pos.y - mouse.y - 2;
                        pos.y = mouse.y + 2;
                        if (this._size.y < minSize.y) {
                            pos.y += this._size.y - minSize.y;
                            this._size.y = minSize.y;
                        }
                        if (this._size.y > maxSize.y) {
                            pos.y += this._size.y - maxSize.y;
                            this._size.y = maxSize.y;
                        }
                        break;
                    case 'bottom':
                        this._size.y = mouse.y - 4 - pos.y;
                        if (this._size.y < minSize.y) {
                            this._size.y = minSize.y;
                        }
                        if (this._size.y > maxSize.y) {
                            this._size.y = maxSize.y;
                        }
                        break;
                    case 'left':
                        this._size.x += pos.x - mouse.x - 2;
                        pos.x = mouse.x + 2;
                        if (this._size.x < minSize.x) {
                            pos.x += this._size.x - minSize.x;
                            this._size.x = minSize.x;
                        }
                        if (this._size.x > maxSize.x) {
                            pos.x += this._size.x - maxSize.x;
                            this._size.x = maxSize.x;
                        }
                        break;
                    case 'right':
                        this._size.x = mouse.x - 4 - pos.x;
                        if (this._size.x < minSize.x) {
                            this._size.x = minSize.x;
                        }
                        if (this._size.x > maxSize.x) {
                            this._size.x = maxSize.x;
                        }
                        break;
                }

                this._pos.x = (pos.x + this._size.x / 2) / width;
                this._pos.y = (pos.y + this._size.y / 2) / height;
            }
        },

        // Turn off or on a shadowing effect to signify this widget is being moved.
        // Params:
        //    enabled       Whether to enable __shadow mode.
        __shadow: function (enabled) {
            if (enabled) {
                if (!this.$shadower) {
                    this.$shadower = $('<div class="wcFrameShadower">');
                    this.$frame.append(this.$shadower);
                    this.$shadower.animate({
                        opacity: 0.5
                    }, 300);
                }
            } else {
                if (this.$shadower) {
                    var self = this;
                    this.$shadower.animate({
                        opacity: 0.0
                    }, 300)
                        .queue(function (next) {
                            self.$shadower.remove();
                            self.$shadower = null;
                            next();
                        });
                }
            }
        },

        // Retrieves the bounding rect for this frame.
        __rect: function () {
            if (this.isCollapser()) {
                return this._parent.__rect();
            }

            var offset = this.$frame.offset();
            var width = this.$frame.width();
            var height = this.$frame.height();

            return {
                x: offset.left,
                y: offset.top,
                w: width,
                h: height
            };
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
            this._curTab = -1;
            for (var i = 0; i < this._panelList.length; ++i) {
                this._panelList[i].__destroy();
            }

            while (this._panelList.length) this._panelList.pop();
            if (this.$modalBlocker) {
                this.$modalBlocker.remove();
                this.$modalBlocker = null;
            }
            this.__container(null);
            this._parent = null;
        }
    });

    // window['wcFrame'] = Module;

    return Module;
});

