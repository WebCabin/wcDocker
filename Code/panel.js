/** @module wcPanel */
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
     * @class module:wcPanel
     * The public interface for the docking panel, it contains a number of convenience
     * functions and layout that manages the contents of the panel.
     */
    var Module = dcl(base, {
        declaredClass: 'wcPanel',

        /**
         * @memberOf module:wcPanel
         * @description
         * <b><i>PRIVATE</i> - Use [wcDocker.addPanel]{@link module:wcDocker#addPanel}, [wcDocker.removePanel]{@link module:wcDocker#removePanel}, and
         * [wcDocker.movePanel]{@link module:wcDocker#movePanel} to manage panels, <u>this should never be constructed directly
         * by the user.</u></b>
         * @param {String} type - The name identifier for the panel.
         * @param {module:wcPanel~options} [options] - An options object passed from registration of the panel.
         */
        constructor: function (type, options) {
            /**
             * An options object for the [panel]{@link module:wcPanel} constructor.
             * @typedef module:wcPanel~options
             * @property {String} [icon] - A CSS classname that represents the icon that should display on this panel's tab widget.
             * @property {String} [faicon] - An icon name using the [Font-Awesome]{@link http://fortawesome.github.io/Font-Awesome/} library.
             * @property {String|Boolean} [title] - A custom title to display for this panel, if false, title bar will not be shown.
             * @property {Number|String} [detachToWidth=600] - Determines the new width when the panel is detached (0 = Don't change). Can be a pixel value, or a string with a 'px' or '%' suffix.
             * @property {Number|String} [detachToHeight=400] - Determines the new height when the panel is detached (0 = Don't change).  Can be a pixel value, or a string with a 'px' or '%' suffix.
             */

            /**
             * The outer container element of the panel.
             * @member {external:jQuery~Object}
             */
            this.$container = null;
            this._parent = null;
            this.$icon = null;
            this.$title = null;
            this.$titleText = null;
            this.$loading = null;

            this._panelObject = null;
            this._initialized = false;
            this._collapseDirection = undefined;

            this._type = type;
            this._title = type;
            this._titleVisible = true;

            this._options = options;

            this._layout = null;

            this._buttonList = [];

            this._actualPos = {
                x: 0.5,
                y: 0.5
            };

            this._actualSize = {
                x: 0,
                y: 0
            };

            this._resizeData = {
                time: -1,
                timeout: false,
                delta: 150
            };

            this._pos = {
                x: 0.5,
                y: 0.5
            };

            this._moveData = {
                time: -1,
                timeout: false,
                delta: 150
            };

            this._size = {
                x: -1,
                y: -1
            };

            this._minSize = {
                x: 100,
                y: 100
            };

            this._maxSize = {
                x: Infinity,
                y: Infinity
            };

            this._scroll = {
                x: 0,
                y: 0
            };

            this._scrollable = {
                x: true,
                y: true
            };

            this._collapsible = true;
            this._overflowVisible = false;
            this._moveable = true;
            this._closeable = true;
            this._resizeVisible = true;
            this._isVisible = false;

            this._events = {};

            this.__init();
        },
        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        // Public Functions
        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        /**
         * Gets, or Sets the title for this panel.
         * Titles appear in the tab widget associated with the panel.
         * @param {String|Boolean} title - If supplied, sets the new title (this can be html text). If false, the title bar will be removed.
         * @returns {String|Boolean} - The current title.
         */
        title: function (title) {
            if (typeof title !== 'undefined') {
                if (title === false) {
                    this._titleVisible = false;
                    this.$titleText.html(this._type);
                } else {
                    this._title = title;
                    this.$titleText.html(title);
                }

                if (this.$icon) {
                    this.$titleText.prepend(this.$icon);
                }

                if (this._parent && this._parent.instanceOf('wcFrame')) {
                    this._parent.__updateTabs();
                }
            }

            return this._title;
        },

        /**
         * Retrieves the registration info of the panel as declared from
         * [wcDocker.registerPanelType]{@link module:wcDocker#registerPanelType};
         * See [wcDocker.panelTypeInfo]{@link module:wcDocker#panelTypeInfo}.
         * @returns {module:wcDocker~registerOptions} - Registered options of the panel type.
         */
        info: function () {
            return this.docker().panelTypeInfo(this._type);
        },

        /**
         * Retrieves the layout instance.
         * @returns {module:wcLayoutSimple|wcLayoutTable} - The layout instance.
         */
        layout: function () {
            return this._layout;
        },

        /**
         * Brings this panel into focus. If it is floating, it will be moved to the front
         * of all other panels.
         * @param {Boolean} [flash] - If true, in addition to bringing the panel into focus, it will also flash for the user.
         */
        focus: function (flash) {
            var docker = this.docker();
            if (docker) {
                docker.__focus(this._parent, flash);
                for (var i = 0; i < this._parent._panelList.length; ++i) {
                    if (this._parent._panelList[i] === this && this._parent._curTab !== i) {
                        this._parent.panel(i);
                        break;
                    }
                }
            }
        },

        /**
         * @callback wcPanel~CollapseDirection
         * @see wcPanel#collapseDirection
         * @param {module:wcDocker~Bounds} bounds - The bounds of this panel relative to the wcDocker container.
         * @returns {module:wcDocker.DOCK} - A collapse direction to use, must only be LEFT, RIGHT, or BOTTOM
         */

        /**
         * Gets, or Sets the collapse direction for this panel.
         * @param {module:wcPanel~CollapseDirection|wcDocker.DOCK} direction - The collapse direction to use for this panel.<br>If this value is omitted, the default collapse direction will be used.
         */
        collapseDirection: function (direction) {
            this._collapseDirection = direction;
        },

        /**
         * Retrieves whether this panel can be seen by the user.
         * @returns {Boolean} - Visibility state.
         */
        isVisible: function () {
            return this._isVisible;
        },

        /**
         * Retrieves whether this panel is floating.
         * @returns {Boolean}
         */
        isFloating: function () {
            if (this._parent && this._parent.instanceOf('wcFrame')) {
                return this._parent._isFloating;
            }
            return false;
        },

        /**
         * Retrieves whether this panel is in focus.
         * @return {Boolean}
         */
        isInFocus: function () {
            var docker = this.docker();
            if (docker && this._parent && this._parent.instanceOf('wcFrame')) {
                return this._parent === docker._focusFrame;
            }
            return false;
        },

        /**
         * Creates a new custom button that will appear in the title bar when the panel is active.
         * @param {String} name               - The name of the button, to identify it later.
         * @param {String} className          - A CSS class name to apply to the button.
         * @param {String} text               - Text to apply to the button.
         * @param {String} tip                - Tooltip text for the user.
         * @param {Boolean} [isTogglable]     - If true, will make the button toggle on and off per click.
         * @param {String} [toggleClassName]  - If this button is toggleable, you can designate an optional CSS class name that will replace the original class name.
         */
        addButton: function (name, className, text, tip, isTogglable, toggleClassName) {
            this._buttonList.push({
                name: name,
                className: className,
                toggleClassName: toggleClassName,
                text: text,
                tip: tip,
                isTogglable: isTogglable,
                isToggled: false
            });

            if (this._parent && this._parent.instanceOf('wcFrame')) {
                this._parent.__update();
            }
        },

        /**
         * Removes a custom button from the panel.
         * @param {String} name - The name identifier for the button to remove.
         * @returns {Boolean} - Success or failure.
         */
        removeButton: function (name) {
            for (var i = 0; i < this._buttonList.length; ++i) {
                if (this._buttonList[i].name === name) {
                    this._buttonList.splice(i, 1);
                    if (this._parent.instanceOf('wcFrame')) {
                        this._parent.__onTabChange();
                    }

                    if (this._parent && this._parent.instanceOf('wcFrame')) {
                        this._parent.__update();
                    }

                    return true;
                }
            }
            return false;
        },

        /**
         * Gets, or Sets the current toggle state of a custom button that was
         * added using [wcPanel.addButton]{@link module:wcPanel#addButton}.
         * @param {String} name           - The name identifier of the button.
         * @param {Boolean} [toggleState] - If supplied, will assign a new toggle state to the button.
         * @returns {Boolean} - The current toggle state of the button.
         */
        buttonState: function (name, toggleState) {
            for (var i = 0; i < this._buttonList.length; ++i) {
                if (this._buttonList[i].name === name) {
                    if (typeof toggleState !== 'undefined') {
                        this._buttonList[i].isToggled = toggleState;
                        if (this._parent && this._parent.instanceOf('wcFrame')) {
                            this._parent.__onTabChange();
                        }
                    }

                    if (this._parent && this._parent.instanceOf('wcFrame')) {
                        this._parent.__update();
                    }

                    return this._buttonList[i].isToggled;
                }
            }
            return false;
        },

        /**
         * Gets, or Sets the default position of the panel if it is floating. <b>Warning: after the panel has been initialized, this value no longer reflects the current position of the panel.</b>
         * @param {Number|String} [x] - If supplied, sets the horizontal position of the floating panel. Can be a percentage position, or a string with a 'px' or '%' suffix.
         * @param {Number|String} [y] - If supplied, sets the vertical position of the floating panel. Can be a percentage position, or a string with a 'px' or '%' suffix.
         * @returns {module:wcDocker~Coordinate} - The current default position of the panel.
         */
        initPos: function (x, y) {
            if (typeof x !== 'undefined') {
                var docker = this.docker();
                if (docker) {
                    this._pos.x = docker.__stringToPercent(x, docker.$container.width());
                } else {
                    this._pos.x = x;
                }
            }
            if (typeof y !== 'undefined') {
                var docker = this.docker();
                if (docker) {
                    this._pos.y = docker.__stringToPercent(y, docker.$container.height());
                } else {
                    this._pos.y = y;
                }
            }

            return {x: this._pos.x, y: this._pos.y};
        },

        /**
         * Gets, or Sets the desired size of the panel. <b>Warning: after the panel has been initialized, this value no longer reflects the current size of the panel.</b>
         * @param {Number|String} [x] - If supplied, sets the desired initial horizontal size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
         * @param {Number|String} [y] - If supplied, sets the desired initial vertical size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
         * @returns {module:wcDocker~Size} - The current initial size of the panel.
         */
        initSize: function (x, y) {
            if (typeof x !== 'undefined') {
                var docker = this.docker();
                if (docker) {
                    this._size.x = docker.__stringToPixel(x, docker.$container.width());
                } else {
                    this._size.x = x;
                }
            }
            if (typeof y !== 'undefined') {
                var docker = this.docker();
                if (docker) {
                    this._size.y = docker.__stringToPixel(y, docker.$container.height());
                } else {
                    this._size.y = y;
                }
            }
            return {x: this._size.x, y: this._size.y};
        },

        /**
         * Gets, or Sets the minimum size constraint of the panel.
         * @param {Number|String} [x] - If supplied, sets the desired minimum horizontal size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
         * @param {Number|String} [y] - If supplied, sets the desired minimum vertical size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
         * @returns {module:wcDocker~Size} - The current minimum size.
         */
        minSize: function (x, y) {
            if (typeof x !== 'undefined') {
                var docker = this.docker();
                if (docker) {
                    this._minSize.x = docker.__stringToPixel(x, docker.$container.width());
                } else {
                    this._minSize.x = x;
                }
            }
            if (typeof y !== 'undefined') {
                var docker = this.docker();
                if (docker) {
                    this._minSize.y = docker.__stringToPixel(y, docker.$container.height());
                } else {
                    this._minSize.y = y;
                }
            }
            return {x: this._minSize.x, y: this._minSize.y};
        },

        /**
         * Gets, or Sets the maximum size constraint of the panel.
         * @param {Number|String} [x] - If supplied, sets the desired maximum horizontal size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
         * @param {Number|String} [y] - If supplied, sets the desired maximum vertical size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
         * @returns {module:wcDocker~Size} - The current maximum size.
         */
        maxSize: function (x, y) {
            if (typeof x !== 'undefined') {
                var docker = this.docker();
                if (docker) {
                    this._maxSize.x = docker.__stringToPixel(x, docker.$container.width());
                } else {
                    this._maxSize.x = x;
                }
            }
            if (typeof y !== 'undefined') {
                var docker = this.docker();
                if (docker) {
                    this._maxSize.y = docker.__stringToPixel(y, docker.$container.height());
                } else {
                    this._maxSize.y = y;
                }
            }
            return {x: this._maxSize.x, y: this._maxSize.y};
        },

        /**
         * Retrieves the width of the panel contents.
         * @returns {Number} - Panel width.
         */
        width: function () {
            if (this.$container) {
                return this.$container.width();
            }
            return 0.0;
        },

        /**
         * Retrieves the height of the panel contents.
         * @returns {Number} - Panel height.
         */
        height: function () {
            if (this.$container) {
                return this.$container.height();
            }
            return 0.0;
        },

        /**
         * Sets the icon for the panel, shown in the panels tab widget.
         * Must be a css class name that contains the icon.
         */
        icon: function (icon) {
            if (!this.$icon) {
                this.$icon = $('<div>');
                this.$titleText.prepend(this.$icon);
            }

            this.$icon.removeClass();
            this.$icon.addClass('wcTabIcon ' + icon);

            if (this._parent && this._parent.instanceOf('wcFrame')) {
                this._parent.__updateTabs();
            }
        },

        /**
         * Sets the icon for the panel, shown in the panels tab widget,
         * to an icon defined from the [Font-Awesome]{@link http://fortawesome.github.io/Font-Awesome/} library.
         */
        faicon: function (icon) {
            if (!this.$icon) {
                this.$icon = $('<div>');
                this.$titleText.prepend(this.$icon);
            }

            this.$icon.removeClass();
            this.$icon.addClass('wcTabIcon fa fa-fw fa-' + icon);

            if (this._parent && this._parent.instanceOf('wcFrame')) {
                this._parent.__updateTabs();
            }
        },

        /**
         * Gets, or Sets whether the window is scrollable.
         * @param {Boolean} [x] - If supplied, assigns whether the window is scrollable in the horizontal direction.
         * @param {Boolean} [y] - If supplied, assigns whether the window is scrollable in the vertical direction.
         * @returns {module:wcDocker~Scrollable} - The current scrollable status.
         */
        scrollable: function (x, y) {
            if (typeof x !== 'undefined') {
                this._scrollable.x = x ? true : false;
                this._scrollable.y = y ? true : false;
            }

            return {x: this._scrollable.x, y: this._scrollable.y};
        },

        /**
         * Gets, or Sets the scroll position of the panel's contents if it is scrollable; See [wcPanel.scrollable]{@link module:wcPanel#scrollable}).
         * @param {Number} [x]        - If supplied, sets the scroll horizontal position of the panel.
         * @param {Number} [y]        - If supplied, sets the scroll vertical position of the panel.
         * @param {Number} [duration] - If supplied, will animate the scroll movement with the supplied duration (in milliseconds).
         * @returns {module:wcDocker~Coordinate} The current scroll position.
         */
        scroll: function (x, y, duration) {
            if (!this.$container) {
                return {x: 0, y: 0};
            }

            if (typeof x !== 'undefined') {
                if (duration) {
                    this.$container.parent().stop().animate({
                        scrollLeft: x,
                        scrollTop: y
                    }, duration);
                } else {
                    this.$container.parent().scrollLeft(x);
                    this.$container.parent().scrollTop(y);
                }
            }

            return {
                x: this.$container.parent().scrollLeft(),
                y: this.$container.parent().scrollTop()
            };
        },

        /**
         * Gets, or Sets whether this panel can be collapsed to the side or bottom.<br>
         * This only works if the collapse feature is enabled {@link module:wcDocker~Options}.
         * @param {Boolean} [enabled] - If supplied, assigns whether collapsing is enabled.
         * @returns {Boolean} - The current collapsible enabled state.
         */
        collapsible: function (enabled) {
            if (typeof enabled !== 'undefined') {
                this._collapsible = enabled ? true : false;
            }

            return this._collapsible;
        },

        /**
         * Gets, or Sets whether overflow on this panel is visible.
         * Use this if a child element within this panel is intended to 'popup' and be visible outside of its parent area.
         * @param {Boolean} [visible] - If supplied, assigns whether overflow is visible.
         * @returns {Boolean} - The current overflow visibility.
         */
        overflowVisible: function (visible) {
            if (typeof visible !== 'undefined') {
                this._overflowVisible = visible ? true : false;
            }

            return this._overflowVisible;
        },

        /**
         * Gets, or Sets whether the contents of the panel are visible on resize.
         * Use this if the panel has extremely expensive contents which take a long time to resize.
         * @param {Boolean} [visible] - If supplied, assigns whether panel contents are visible during resize.
         * @returns {Boolean} - The current resize visibility.
         */
        resizeVisible: function (visible) {
            if (typeof visible !== 'undefined') {
                this._resizeVisible = visible ? true : false;
            }

            return this._resizeVisible;
        },

        /**
         * Sets, or Gets the moveable status of the window.
         * Note: Other panels can not dock beside a non-moving panel as doing so could cause it to move.
         * @param {Boolean} [enabled] - If supplied, assigns whether this panel can be moved.
         * @returns {Boolean} - Whether the panel is moveable.
         */
        moveable: function (enabled) {
            if (typeof enabled !== 'undefined') {
                this._moveable = enabled ? true : false;

                this.$title.toggleClass('wcNotMoveable', !this._moveable);
            }

            return this._moveable;
        },

        /**
         * Gets, or Sets whether this dock window can be closed by the user.
         * Note: The panel can still be closed programmatically.
         * @param {Boolean} [enabled] - If supplied, toggles whether it can be closed.
         * @returns {Boolean} the current closeable status.
         */
        closeable: function (enabled) {
            if (typeof enabled !== 'undefined') {
                this._closeable = enabled ? true : false;
                if (this._parent) {
                    this._parent.__update();
                }
            }

            return this._closeable;
        },

        /**
         * Forces the window to close.
         */
        close: function () {
            var docker = this.docker();
            if (docker) {
                docker.__closePanel(this);
            }
        },

        /**
         * Shows the loading screen.
         * @param {String} [label] - An optional label to display.
         * @param {Number} [opacity=0.4] - If supplied, assigns a custom opacity value to the loading screen.
         * @param {Number} [textOpacity=1] - If supplied, assigns a custom opacity value to the loading icon and text displayed.
         */
        startLoading: function (label, opacity, textOpacity) {
            if (!this.$loading) {
                this.$loading = $('<div class="wcLoadingContainer"></div>');
                this.$container.append(this.$loading);

                var $background = $('<div class="wcLoadingBackground"></div>');
                if (typeof opacity !== 'number') {
                    opacity = 0.4;
                }

                this.$loading.append($background);

                var $icon = $('<div class="wcLoadingIconContainer"><i class="wcLoadingIcon ' + this.docker()._options.loadingClass + '"></i></div>');
                this.$loading.append($icon);

                if (label) {
                    var $label = $('<span class="wcLoadingLabel">' + label + '</span>');
                    this.$loading.append($label);
                }

                if (typeof textOpacity !== 'number') {
                    textOpacity = 1;
                }

                // Override opacity values if the global loading screen is active.
                if (this.docker().$loading) {
                    opacity = 0;
                    textOpacity = 0;
                }

                $background.css('opacity', opacity);
                $icon.css('opacity', textOpacity);

                if ($label) {
                    $label.css('opacity', textOpacity);
                }
            }
        },

        /**
         * Hides the loading screen.
         * @param {Number} [fadeDuration=0] - If supplied, assigns a fade out duration for the loading screen.
         */
        finishLoading: function (fadeDuration) {
            if (this.$loading) {
                if (fadeDuration > 0) {
                    var self = this;
                    this.$loading.fadeOut(fadeDuration, function () {
                        self.$loading.remove();
                        self.$loading = null;
                        self.docker().__testLoadFinished();
                    });
                } else {
                    this.$loading.remove();
                    this.$loading = null;
                    this.docker().__testLoadFinished();
                }

            }
        },

        /**
         * Registers an [event]{@link module:wcDocker.EVENT} associated with this panel.
         * @param {String} eventType          - The event type, can be a custom event string or a [predefined event]{@link module:wcDocker.EVENT}.
         * @param {module:wcDocker~onEvent} handler  - An event handler function to be called when the event is fired.
         * @returns {Boolean} - Event registration success or failure.
         */
        on: function (eventType, handler) {
            if (!eventType) {
                return false;
            }

            if (!this._events[eventType]) {
                this._events[eventType] = [];
            }

            if (this._events[eventType].indexOf(handler) !== -1) {
                return false;
            }

            this._events[eventType].push(handler);
            return true;
        },

        /**
         * Unregisters an [event]{@link module:wcDocker.EVENT} associated with this panel.
         * @param {module:wcDocker.EVENT} eventType          - The event type, can be a custom event string or a [predefined event]{@link module:wcDocker.EVENT}.
         * @param {module:wcDocker~event:onEvent} [handler]  - The handler function registered with the event. If omitted, all events registered to the event type are unregistered.
         */
        off: function (eventType, handler) {
            if (typeof eventType === 'undefined') {
                this._events = {};
                return;
            } else {
                if (this._events[eventType]) {
                    if (typeof handler === 'undefined') {
                        this._events[eventType] = [];
                    } else {
                        for (var i = 0; i < this._events[eventType].length; ++i) {
                            if (this._events[eventType][i] === handler) {
                                this._events[eventType].splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            }
        },

        /**
         * Triggers an [event]{@link module:wcDocker.EVENT} of a given type to all panels, including itself.
         * @param {module:wcDocker.EVENT} eventType  - The event type, can be a custom event string or a [predefined event]{@link module:wcDocker.EVENT}.
         * @param {Object} [data]             - A custom data object to pass into all handlers.
         */
        trigger: function (eventType, data) {
            var docker = this.docker();
            if (docker) {
                docker.trigger(eventType, data);
            }
        },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

        // Initialize
        __init: function () {
            var layoutClass = (this._options && this._options.layout) || 'wcLayoutTable';
            this._layout = new layoutClasses[layoutClass](this.$container, this);
            this.$title = $('<div class="wcPanelTab">');
            this.$titleText = $('<div>' + this._title + '</div>');
            this.$title.append(this.$titleText);

            if (this._options.hasOwnProperty('title')) {
                this.title(this._options.title);
            }

            if (this._options.icon) {
                this.icon(this._options.icon);
            }
            if (this._options.faicon) {
                this.faicon(this._options.faicon);
            }
        },

        // Updates the size of the layout.
        __update: function () {
            var docker = this.docker();
            if (!docker) return;

            this._layout.__update();
            if (!this.$container) {
                return;
            }

            if (this._resizeVisible) {
                this._parent.$frame.removeClass('wcHideOnResize');
            } else {
                this._parent.$frame.addClass('wcHideOnResize');
            }

            if (!this._initialized) {
                this._initialized = true;
                var self = this;
                setTimeout(function () {
                    self.__trigger(wcDocker.EVENT.INIT);

                    docker.__testLoadFinished();
                }, 0);
            } else {
                this.__trigger(wcDocker.EVENT.UPDATED);
            }

            var width = this.$container.width();
            var height = this.$container.height();
            if (this._actualSize.x !== width || this._actualSize.y !== height) {
                this._actualSize.x = width;
                this._actualSize.y = height;

                this._resizeData.time = new Date();
                if (!this._resizeData.timeout) {
                    this._resizeData.timeout = true;
                    setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
                    this.__trigger(wcDocker.EVENT.RESIZE_STARTED, {
                        width: this._actualSize.x,
                        height: this._actualSize.y
                    });
                }
                this.__trigger(wcDocker.EVENT.RESIZED, {width: this._actualSize.x, height: this._actualSize.y});
            }

            var offset = this.$container.offset();
            if (this._actualPos.x !== offset.left || this._actualPos.y !== offset.top) {
                this._actualPos.x = offset.left;
                this._actualPos.y = offset.top;

                this._moveData.time = new Date();
                if (!this._moveData.timeout) {
                    this._moveData.timeout = true;
                    setTimeout(this.__moveEnd.bind(this), this._moveData.delta);
                    this.__trigger(wcDocker.EVENT.MOVE_STARTED, {x: this._actualPos.x, y: this._actualPos.y});
                }
                this.__trigger(wcDocker.EVENT.MOVED, {x: this._actualPos.x, y: this._actualPos.y});
            }
        },

        __resizeEnd: function () {
            if (new Date() - this._resizeData.time < this._resizeData.delta) {
                setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
            } else {
                this._resizeData.timeout = false;
                this.__trigger(wcDocker.EVENT.RESIZE_ENDED, {width: this._actualSize.x, height: this._actualSize.y});
            }
        },

        __moveEnd: function () {
            if (new Date() - this._moveData.time < this._moveData.delta) {
                setTimeout(this.__moveEnd.bind(this), this._moveData.delta);
            } else {
                this._moveData.timeout = false;
                this.__trigger(wcDocker.EVENT.MOVE_ENDED, {x: this._actualPos.x, y: this._actualPos.y});
            }
        },

        __isVisible: function (inView) {
            if (this._isVisible !== inView) {
                this._isVisible = inView;

                this.__trigger(wcDocker.EVENT.VISIBILITY_CHANGED, this._isVisible);
            }
        },

        // Saves the current panel configuration into a meta
        // object that can be used later to restore it.
        __save: function () {
            var data = {};
            data.type = 'wcPanel';
            data.panelType = this._type;
            // data.title = this._title;
            data.size = {
                x: this._size.x,
                y: this._size.y
            };
            // data.minSize = {
            //   x: this._minSize.x,
            //   y: this._minSize.y,
            // };
            // data.maxSize = {
            //   x: this._maxSize.x,
            //   y: this._maxSize.y,
            // };
            // data.scrollable = {
            //   x: this._scrollable.x,
            //   y: this._scrollable.y,
            // };
            // data.moveable = this._moveable;
            // data.closeable = this._closeable;
            // data.resizeVisible = this.resizeVisible();
            data.customData = {};
            this.__trigger(wcDocker.EVENT.SAVE_LAYOUT, data.customData);
            return data;
        },

        // Restores a previously saved configuration.
        __restore: function (data, docker) {
            // this._title = data.title;
            if (data.size) {
                this._size.x = data.size.x;
                this._size.y = data.size.y;
            }
            // this._minSize.x = data.minSize.x;
            // this._minSize.y = data.minSize.y;
            // this._maxSize.x = data.maxSize.x;
            // this._maxSize.y = data.maxSize.y;
            // this._scrollable.x = data.scrollable.x;
            // this._scrollable.y = data.scrollable.y;
            // this._moveable = data.moveable;
            // this._closeable = data.closeable;
            // this.resizeVisible(data.resizeVisible);
            this.__trigger(wcDocker.EVENT.RESTORE_LAYOUT, data.customData);
        },

        // Triggers an event of a given type onto this current panel.
        // Params:
        //    eventType     The event to trigger.
        //    data          A custom data object to pass into all handlers.
        __trigger: function (eventType, data) {
            if (!eventType) {
                return false;
            }

            if (this._events[eventType]) {
                var events = this._events[eventType].slice(0);
                for (var i = 0; i < events.length; ++i) {
                    events[i].call(this, data);
                }
            }
        },

        // Retrieves the bounding rect for this widget.
        __rect: function () {
            var offset = this.$container.offset();
            var width = this.$container.width();
            var height = this.$container.height();

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
                this._layout.__container(this.$container);
                if (this.$loading) {
                    this.$container.append(this.$loading);
                }
            } else {
                this._layout.__container(null);
                this.finishLoading();
            }
            return this.$container;
        },
        // Destroys this panel.
        __destroy: function () {
            this._panelObject = null;
            this.off();

            this.__container(null);
            this._parent = null;
        }
    });

    // window['wcPanel'] = Module;
    return Module;
});
