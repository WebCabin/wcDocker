/** @module wcTabFrame */
define([
    "dcl/dcl",
    "./types",
    "./base"
], function (dcl, wcDocker, base) {

    /**
     * @class
     * A tab widget container, usable inside a panel to break up multiple elements into separate tabbed pages.
     */
    var Module = dcl(base, {
        declaredClass: 'wcTabFrame',

        LEFT_TAB_BUFFER: 15,

        /**
         * @memberOf module:wcTabFrame
         * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this layout.
         * @param {module:wcPanel} parent - The parent panel object for this widget.
         */
        constructor: function(container, parent) {
            /**
             * The outer container element of the widget.
             * @member {external:jQuery~Object}
             */
            this.$container = $(container);
            this._parent = parent;

            this.$frame = null;
            this.$tabBar = null;
            this.$tabScroll = null;
            this.$center = null;
            this.$tabLeft = null;
            this.$tabRight = null;
            this.$close = null;

            this._tabOrientation = wcDocker.TAB.TOP;
            this._canScrollTabs = false;
            this._tabScrollPos = 0;
            this._curTab = -1;
            this._layoutList = [];
            this._moveable = true;

            this._boundEvents = [];

            this.__init();
        },

        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        // Public Functions
        ///////////////////////////////////////////////////////////////////////////////////////////////////////

        /**
         * Manually update the contents of this tab frame.
         * @function module:wcTabFrame#update
         */
        update: function () {
            var scrollTop = this.$center.scrollTop();
            this.__updateTabs();
            this.$center.scrollTop(scrollTop);
        },

        /**
         * Destroys the widget.
         * @function module:wcTabFrame#destroy
         */
        destroy: function () {
            this.__destroy();
        },

        /**
         * Gets the total number of tabs in this frame.
         * @version 3.0.0
         * @function module:wcTabFrame#tabCount
         * @returns {Number}
         */
        tabCount: function () {
            return this._layoutList.length;
        },

        /**
         * Gets, or Sets the tab orientation for the frame. This puts the tabbed widgets visually on any side of the tab frame.
         * @version 3.0.0
         * @function module:wcTabFrame#tabOrientation
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
         * Adds a new tabbed page into the widget.
         * @function module:wcTabFrame#addTab
         * @param {String} name - The name of the new tab page.
         * @param {Number} [index] - If supplied and above -1, will insert the new tab page at the given tab index, otherwise the new tab is appended to the end.
         * @param {module:wcDocker.LAYOUT} [layout] - If supplied, will set the type of layout to use for this tab.
         * @returns {module:wcLayoutSimple|wcLayoutTable} - The layout of the newly created tab page.
         */
        addTab: function (name, index, layout) {
            var layoutClass = layout || 'wcLayoutTable';
            var newLayout = new (this.docker().__getClass(layoutClass))('.wcDockerTransition', this._parent);
            newLayout.name = name;
            newLayout._scrollable = {
                x: true,
                y: true
            };
            newLayout._scroll = {
                x: 0,
                y: 0
            };
            newLayout._closeable = false;
            newLayout._overflowVisible = false;

            if (typeof index === 'undefined' || index <= -1) {
                this._layoutList.push(newLayout);
            } else {
                this._layoutList.splice(index, 0, newLayout);
            }

            if (this._curTab === -1 && this._layoutList.length) {
                this._curTab = 0;
            }

            this.__updateTabs();

            return newLayout;
        },

        /**
         * Removes a tab page from the widget.
         * @function module:wcTabFrame#removeTab
         * @param {Number} index - The tab page index to remove.
         * @returns {Boolean} - Success or failure.
         */
        removeTab: function (index) {
            if (index > -1 && index < this._layoutList.length) {
                var name = this._layoutList[index].name;
                this._layoutList[index].__destroy();
                this._layoutList.splice(index, 1);

                if (this._curTab >= index) {
                    this._curTab--;

                    if (this._curTab < 0) {
                        this._curTab = 0;
                    }
                }

                this.__updateTabs();
                this._parent.__trigger(wcDocker.EVENT.CUSTOM_TAB_CLOSED, {obj: this, name: name, index: index});
                return true;
            }
            return false;
        },

        /**
         * Gets, or Sets the currently visible tab page.
         * @function module:wcTabFrame#tab
         * @param {Number} [index] - If supplied, sets the current tab page index.
         * @param {Boolean} [scrollTo] - If true, will auto scroll the tab bar until the selected tab is visible.
         * @returns {Number} - The index of the currently visible tab page.
         */
        tab: function (index, scrollTo) {
            if (typeof index !== 'undefined') {
                if (index > -1 && index < this._layoutList.length) {
                    this.$tabBar.find('> .wcTabScroller > .wcPanelTab[id="' + this._curTab + '"]').removeClass('wcPanelTabActive');
                    this.$center.children('.wcPanelTabContent[id="' + this._curTab + '"]').addClass('wcPanelTabContentHidden');
                    this._curTab = index;
                    this.$tabBar.find('> .wcTabScroller > .wcPanelTab[id="' + index + '"]').addClass('wcPanelTabActive');
                    this.$center.children('.wcPanelTabContent[id="' + index + '"]').removeClass('wcPanelTabContentHidden');
                    this.__updateTabs(scrollTo);

                    var name = this._layoutList[this._curTab].name;
                    this._parent.__trigger(wcDocker.EVENT.CUSTOM_TAB_CHANGED, {obj: this, name: name, index: index});
                }
            }

            return this._curTab;
        },

        /**
         * Retrieves the layout for a given tab page.
         * @function module:wcTabFrame#layout
         * @param {Number} index - The tab page index to retrieve.
         * @returns {module:wcLayoutSimple|wcLayoutTable|Boolean} - The layout of the found tab page, or false.
         */
        layout: function (index) {
            if (index > -1 && index < this._layoutList.length) {
                return this._layoutList[index];
            }
            return false;
        },

        /**
         * Moves a tab page from a given index to another index.
         * @function module:wcTabFrame#moveTab
         * @param {Number} fromIndex - The current tab page index to move from.
         * @param {Number} toIndex - The new tab page index to move to.
         * @returns {external:jQuery~Object} - The new element of the moved tab, or false if an error occurred.
         */
        moveTab: function (fromIndex, toIndex) {
            if (fromIndex >= 0 && fromIndex < this._layoutList.length &&
                toIndex >= 0 && toIndex < this._layoutList.length) {
                var panel = this._layoutList.splice(fromIndex, 1);
                this._layoutList.splice(toIndex, 0, panel[0]);

                // Preserve the currently active tab.
                if (this._curTab === fromIndex) {
                    this._curTab = toIndex;
                }

                this.__updateTabs();

                return this.$tabBar.find('> .wcTabScroller > .wcPanelTab[id="' + toIndex + '"]')[0];
            }
            return false;
        },

        /**
         * Gets, or Sets whether the tabs can be reordered by the user.
         * @function module:wcTabFrame#moveable
         * @param {Boolean} [moveable] - If supplied, assigns whether tab pages can be reordered.
         * @returns {Boolean} - Whether tab pages are currently moveable.
         */
        moveable: function (moveable) {
            if (typeof moveable !== 'undefined') {
                this._moveable = moveable;
            }
            return this._moveable;
        },

        /**
         * Gets, or Sets whether a tab can be closed (removed) by the user.
         * @function module:wcTabFrame#closeable
         * @param {Number} index - The index of the tab page.
         * @param {Boolean} [closeable] - If supplied, assigns whether the tab page can be closed.
         * @returns {Boolean} - Whether the tab page can be closed.
         */
        closeable: function (index, closeable) {
            if (index > -1 && index < this._layoutList.length) {
                var layout = this._layoutList[index];

                if (typeof closeable !== 'undefined') {
                    layout._closeable = closeable;
                }

                return layout._closeable;
            }
            return false;
        },

        /**
         * Gets, or Sets whether a tab page area is scrollable.
         * @function module:wcTabFrame#scrollable
         * @param {Number} index - The index of the tab page.
         * @param {Boolean} [x] - If supplied, assigns whether the tab page is scrollable in the horizontal direction.
         * @param {Boolean} [y] - If supplied, assigns whether the tab page is scrollable in the vertical direction.
         * @returns {module:wcDocker~Scrollable} - The current scrollable status of the tab page.
         */
        scrollable: function (index, x, y) {
            if (index > -1 && index < this._layoutList.length) {
                var layout = this._layoutList[index];

                var changed = false;
                if (typeof x !== 'undefined') {
                    layout._scrollable.x = x;
                    changed = true;
                }
                if (typeof y !== 'undefined') {
                    layout._scrollable.y = y;
                    changed = true;
                }

                if (changed) {
                    this.__onTabChange();
                }

                return {
                    x: layout._scrollable.x,
                    y: layout._scrollable.y
                };
            }
            return false;
        },

        /**
         * Gets, or Sets whether overflow on a tab area is visible.<br>
         * Use this if a child element within this panel is intended to 'popup' and be visible outside of its parent area.
         * @function module:wcTabFrame#overflowVisible
         * @param {Number} index - The index of the tab page.
         * @param {Boolean} [visible] - If supplied, assigns whether overflow is visible.
         * @returns {Boolean} - The current overflow visiblity status of the tab page.
         */
        overflowVisible: function (index, visible) {
            if (index > -1 && index < this._layoutList.length) {
                var layout = this._layoutList[index];

                if (typeof overflow !== 'undefined') {
                    layout._overflowVisible = overflow;
                    this.__onTabChange();
                }
                return layout._overflowVisible;
            }
            return false;
        },

        /**
         * Gets, or Sets whether the tab frame should fit to its contents.
         * @version 3.0.0
         * @function module:wcTabFrame#fitContents
         * @param {Number} index - The index of the tab page.
         * @param {Boolean} [x] - If supplied, assigns whether the tab page is scrollable in the horizontal direction.
         * @param {Boolean} [y] - If supplied, assigns whether the tab page is scrollable in the vertical direction.
         * @returns {module:wcDocker~FitContents} - The current scrollable status of the tab page.
         */
        fitContents: function (index, x, y) {
            if (index > -1 && index < this._layoutList.length) {
                var layout = this._layoutList[index];

                if (!layout.hasOwnProperty('_fitContents')) {
                    layout._fitContents = {
                        x: false,
                        y: false
                    };
                }

                var changed = false;
                if (typeof x !== 'undefined') {
                    layout._fitContents.x = x;
                    changed = true;
                }
                if (typeof y !== 'undefined') {
                    layout._fitContents.y = y;
                    changed = true;
                }

                if (changed) {
                    this.__onTabChange();
                }

                return {
                    x: layout._fitContents.x,
                    y: layout._fitContents.y
                };
            }
            return false;
        },

        /**
         * Sets the icon for a tab item.
         * @function module:wcTabFrame#icon
         * @param {Number} index - The index of the tab item.
         * @param {String} icon - A CSS class name that represents the icon.
         */
        icon: function (index, icon) {
            if (index > -1 && index < this._layoutList.length) {
                var layout = this._layoutList[index];

                if (!layout.$icon) {
                    layout.$icon = $('<div>');
                }

                layout.$icon.removeClass();
                layout.$icon.addClass('wcTabIcon ' + icon);
            }
        },

        /**
         * Sets the icon for a tab item using the [Font-Awesome]{@link http://fortawesome.github.io/Font-Awesome/} library.
         * @function module:wcTabFrame#faicon
         * @param {Number} index - The index of the tab item.
         * @param {String} icon - A [Font-Awesome]{@link http://fortawesome.github.io/Font-Awesome/} icon name (without the 'fa fa-' prefix).
         */
        faicon: function (index, icon) {
            if (index > -1 && index < this._layoutList.length) {
                var layout = this._layoutList[index];

                if (!layout.$icon) {
                    layout.$icon = $('<div>');
                }

                layout.$icon.removeClass();
                layout.$icon.addClass('fa fa-fw fa-' + icon);
            }
        },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

        // Initialize
        __init: function () {
            this.$frame = $('<div class="wcCustomTab wcWide wcTall">');
            this.$tabBar = $('<div class="wcFrameTitleBar wcCustomTabTitle wcWide">');
            this.$tabScroll = $('<div class="wcTabScroller">');
            this.$center = $('<div class="wcFrameCenter wcPanelBackground">');
            this.$tabLeft = $('<div class="wcFrameButton" title="Scroll tabs to the left."><span class="fa fa-arrow-left"></span>&lt;</div>');
            this.$tabRight = $('<div class="wcFrameButton" title="Scroll tabs to the right."><span class="fa fa-arrow-right"></span>&gt;</div>');
            this.$close = $('<div class="wcFrameButton" title="Close the currently active panel tab"><span class="fa fa-close"></span>X</div>');

            //this.$maximize = $('<div class="wcFrameButton" title="Close the currently active panel tab"><span class="fa fa-expand"></span>X</div>');
            this.$buttonBar = $('<div class="wcFrameButtonBar">');


            this.$tabBar.append(this.$tabScroll);
            this.$tabBar.append(this.$buttonBar);
            this.$buttonBar.append(this.$close);

            //this.$buttonBar.append(this.$maximize);

            this.$frame.append(this.$center);
            this.$frame.append(this.$tabBar);

            this.__container(this.$container);

            this._boundEvents.push({event: wcDocker.EVENT.UPDATED, handler: this.update.bind(this)});
            this._boundEvents.push({event: wcDocker.EVENT.CLOSED, handler: this.destroy.bind(this)});

            for (var i = 0; i < this._boundEvents.length; ++i) {
                this._parent.on(this._boundEvents[i].event, this._boundEvents[i].handler);
            }

            var docker = this.docker();
            if (docker) {
                docker._tabList.push(this);
            }
        },

        __updateTabs: function (scrollTo) {
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

            var tabPositions = [];
            var totalWidth = 0;
            var parentLeft = getOffset(this.$tabScroll);
            var self = this;

            this.$center.children('.wcPanelTabContent').each(function () {
                $(this).addClass('wcPanelTabContentHidden wcPanelTabUnused');
            });

            for (var i = 0; i < this._layoutList.length; ++i) {
                var $tab = $('<div id="' + i + '" class="wcPanelTab"><div>' + this._layoutList[i].name + '</div></div>');
                if (this._moveable) {
                    $tab.addClass('wcCustomTabMoveable');
                }
                this.$tabScroll.append($tab);
                if (this._layoutList[i].$icon) {
                    $tab.find('div').prepend(this._layoutList[i].$icon);
                }

                var $tabContent = this.$center.children('.wcPanelTabContent[id="' + i + '"]');
                if (!$tabContent.length) {
                    $tabContent = $('<div class="wcPanelTabContent wcPanelTabContentHidden" id="' + i + '">');
                    this.$center.append($tabContent);
                }

                this._layoutList[i].__container($tabContent);
                this._layoutList[i]._parent = this;

                var isVisible = this._curTab === i;

                $tabContent.removeClass('wcPanelTabUnused');

                if (isVisible) {
                    $tab.addClass('wcPanelTabActive');
                    $tabContent.removeClass('wcPanelTabContentHidden');
                }

                totalWidth = getOffset($tab) - parentLeft;
                tabPositions.push(totalWidth);

                totalWidth += $tab.outerWidth();
            }

            var tabWidth = 0;
            var titleSize = this.$tabBar.height();
            switch (this._tabOrientation) {
                case wcDocker.TAB.TOP:
                    this.$tabBar.addClass('wcTabTop').removeClass('wcTabLeft wcTabRight wcTabBottom');
                    this.$center.css('top', titleSize).css('left', 0).css('right', 0).css('bottom', 0);
                    tabWidth = this.$center.width();
                    break;
                case wcDocker.TAB.BOTTOM:
                    this.$tabBar.addClass('wcTabBottom').removeClass('wcTabTop wcTabLeft wcTabRight');
                    this.$center.css('top', 0).css('left', 0).css('right', 0).css('bottom', titleSize);
                    tabWidth = this.$center.width();
                    break;

                case wcDocker.TAB.LEFT:
                    this.$tabBar.addClass('wcTabLeft').removeClass('wcTabTop wcTabRight wcTabBottom');
                    this.$center.css('top', 0).css('left', titleSize).css('right', 0).css('bottom', 0);
                    tabWidth = this.$center.height();
                    break;

                case wcDocker.TAB.RIGHT:
                    this.$tabBar.addClass('wcTabRight').removeClass('wcTabTop wcTabLeft wcTabBottom');
                    this.$center.css('top', 0).css('left', 0).css('right', titleSize).css('bottom', 0);
                    tabWidth = this.$center.height();
                    break;
            }

            // Now remove all unused panel tabs.
            this.$center.children('.wcPanelTabUnused').each(function () {
                $(this).remove();
            });

            var buttonSize = this.__onTabChange();

            if (scrollTo) {
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
                this._canScrollTabs = true;
                this.$buttonBar.append(this.$tabRight);
                this.$buttonBar.append(this.$tabLeft);
                buttonSize += this.$tabRight.outerWidth();
                buttonSize += this.$tabLeft.outerWidth();

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
        },

        __onTabChange: function () {
            var buttonSize = 0;
            var layout = this.layout(this._curTab);
            if (layout) {
                this.$center.toggleClass('wcScrollableX', layout._scrollable.x);
                this.$center.toggleClass('wcScrollableY', layout._scrollable.y);
                this.$center.toggleClass('wcOverflowVisible', layout._overflowVisible);

                this.$tabLeft.remove();
                this.$tabRight.remove();

                if (layout._closeable) {
                    this.$close.show();
                    buttonSize += this.$close.outerWidth();
                } else {
                    this.$close.hide();
                }

                if (this._canScrollTabs) {
                    this.$tabBar.append(this.$tabRight);
                    this.$tabBar.append(this.$tabLeft);

                    buttonSize += this.$tabRight.outerWidth() + this.$tabLeft.outerWidth();
                }

                var fit = this.fitContents(this._curTab);
                if (fit.x) {
                    var w = layout.scene().outerWidth();
                    if (this._tabOrientation === wcDocker.TAB.LEFT || this._tabOrientation === wcDocker.TAB.RIGHT) {
                        w += this.$tabScroll.height();
                    }
                    this.$container.css('width', w);
                } else {
                    this.$container.css('width', '');
                }

                if (fit.y) {
                    var h = layout.scene().outerHeight();
                    if (this._tabOrientation === wcDocker.TAB.TOP || this._tabOrientation === wcDocker.TAB.BOTTOM) {
                        h += this.$tabScroll.height();
                    }
                    this.$container.css('height', h);
                } else {
                    this.$container.css('height', '');
                }

                switch (this._tabOrientation) {
                    case wcDocker.TAB.RIGHT:
                    case wcDocker.TAB.LEFT:
                        this.$tabBar.css('width', this.$center.height() || '100%');
                        break;
                    case wcDocker.TAB.TOP:
                    case wcDocker.TAB.BOTTOM:
                        this.$tabBar.css('width', this.$center.width() || '100%');
                    default:
                        break;
                }

                this.$center.scrollLeft(layout._scroll.x);
                this.$center.scrollTop(layout._scroll.y);
            }

            this.$buttonBar.css('min-width', buttonSize).css('width', buttonSize);
            return buttonSize;
        },

        // Handles scroll notifications.
        __scrolled: function () {
            var layout = this.layout(this._curTab);
            layout._scroll.x = this.$center.scrollLeft();
            layout._scroll.y = this.$center.scrollTop();
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
            var docker = this.docker();
            if (docker) {
                var index = docker._tabList.indexOf(this);
                if (index > -1) {
                    docker._tabList.splice(index, 1);
                }
            }

            // Remove all registered events.
            while (this._boundEvents.length) {
                this._parent.off(this._boundEvents[0].event, this._boundEvents[0].handler);
                this._boundEvents.shift();
            }

            this._curTab = -1;
            for (var i = 0; i < this._layoutList.length; ++i) {
                this._layoutList[i].__destroy();
            }

            while (this._layoutList.length) this._layoutList.pop();
            this.__container(null);
            this._parent = null;
        }
    });

    // window['wcTabFrame'] = Module;

    return Module;
});
