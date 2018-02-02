/*!
 * Web Cabin Docker - Docking Layout Interface.
 *
 * Dependencies:
 *  JQuery 1.11.1
 *  JQuery-contextMenu 1.6.6
 *  font-awesome 4.2.0
 *
 * Author: Jeff Houde (lochemage@webcabin.org)
 * Web: https://docker.webcabin.org/
 *
 * Licensed under
 *   MIT License http://www.opensource.org/licenses/mit-license
 *   GPL v3 http://opensource.org/licenses/GPL-3.0
 *
 */
/** @module wcDocker */
define([
    "dcl/dcl",
    "./types",
    './panel',
    './ghost',
    './splitter',
    './frame',
    './collapser',
    './layoutsimple',
    './layouttable',
    './tabframe',
    './drawer',
    './base',
    'lodash'
], function (dcl, wcDocker, wcPanel, wcGhost, wcSplitter, wcFrame, wcCollapser, wcLayoutSimple, wcLayoutTable, wcTabFrame, wcDrawer, base,_) {

    /**
     * Default class name to module mapping, being used for default options
     */
    var defaultClasses = {
        'wcPanel': wcPanel,
        'wcGhost': wcGhost,
        'wcSplitter': wcSplitter,
        'wcFrame': wcFrame,
        'wcCollapser': wcCollapser,
        'wcLayoutSimple': wcLayoutSimple,
        'wcLayoutTable': wcLayoutTable,
        'wcDrawer': wcDrawer,
        'wcTabFrame': wcTabFrame
    };

    /**
     * @class
     *
     * The main docker instance.  This manages all of the docking panels and user input.
     * There should only be one instance of this, although it is not enforced.<br>
     * See {@tutorial getting-started}
     */
    var Module = dcl(base, {
        declaredClass: 'wcDocker',

        /**
         *
         * @memberOf module:wcDocker
         * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element to store the contents of wcDocker.
         * @param {module:wcDocker~Options} [options] - Options for constructing the instance.
         */
        constructor: function (container, options) {

            this.$outer = $(container);
            this.$container = $('<div class="wcDocker">');
            this.$transition = $('<div class="wcDockerTransition">');
            this.$loading = null;

            this.$outer.append(this.$container);
            this.$container.append(this.$transition);

            this._canOrientTabs = true;

            this._events = {};

            this._root = null;
            this._frameList = [];
            this._floatingList = [];
            this._modalList = [];
            this._persistentList = [];
            this._focusFrame = null;
            this._placeholderPanel = null;
            this._contextTimer = 0;
            this._dirty = false;
            this._dirtyDontMove = false;

            this._splitterList = [];
            this._tabList = [];
            this._collapser = {};

            this._dockPanelTypeList = [];

            this._creatingPanel = false;
            this._draggingSplitter = null;
            this._draggingFrame = null;
            this._draggingFrameSizer = null;
            this._draggingFrameTab = null;
            this._draggingFrameTopper = false;
            this._draggingCustomTabFrame = null;
            this._ghost = null;
            this._menuTimer = 0;
            this._mouseOrigin = {x: 0, y: 0};

            this._resizeData = {
                time: -1,
                timeout: false,
                delta: 150
            };

            var defaultOptions = {
                themePath: 'Themes',
                theme: 'default',
                loadingClass: 'fa fa-spinner fa-pulse',
                allowContextMenu: true,
                hideOnResize: false,
                allowCollapse: true,
                responseRate: 10,
                moveStartDelay: 300,
                edgeAnchorSize: 50,
                panelAnchorSize: '15%',
                detachToWidth: '50%',
                detachToHeight: '50%'
            };

            this._options = {};

            //replay default classes into default options
            for (var prop in defaultClasses) {
                defaultOptions[prop+'Class'] = defaultClasses[prop];
            }

            for (var prop in defaultOptions) {
                this._options[prop] = defaultOptions[prop];
            }

            for (var prop in options) {
                this._options[prop] = options[prop];
            }

            this.__init();
        },
        
        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        // Public Functions
        ///////////////////////////////////////////////////////////////////////////////////////////////////////

        /**
         * Gets, or Sets the path where all theme files can be found.
         * "Themes" is the default folder path.
         * @function module:wcDocker#themePath
         * @param {String} path - If supplied, will set the path where all themes can be found.
         * @returns {String} - The currently assigned path.
         */
        themePath: function (path) {
            if (path !== undefined) {
                this._options.themePath = path;
            }
            return this._options.themePath;
        },

        /**
         * Gets, or Sets the current theme used by docker.
         * @function module:wcDocker#theme
         * @param {String} themeName - If supplied, will activate a theme with the given name.
         * @returns {String} - The currently active theme.
         */
        theme: function (themeName) {
            if (themeName !== undefined) {
                var $oldTheme = $('#wcTheme');

                // The default theme requires no additional theme css file.
                var cacheBreak = (new Date()).getTime();
                var ext = themeName.indexOf('.css');
                if (ext > -1) {
                    themeName = themeName.substring(0, ext);
                }
                var $link = $('<link id="wcTheme" rel="stylesheet" type="text/css" href="' + this._options.themePath + '/' + themeName + '.css?v=' + cacheBreak + '"/>');
                this._options.theme = themeName;

                var self = this;
                $link[0].onload = function () {
                    $oldTheme.remove();
                    self.__update();
                };

                $('head').append($link);
            }

            return this._options.theme;
        },

        /**
         * Retrieves whether panel collapsers are enabled.
         * @function module:wcDocker#isCollapseEnabled
         * @version 3.0.0
         * @returns {Boolean} - Collapsers are enabled.
         */
        isCollapseEnabled: function () {
            return (this._canOrientTabs && this._options.allowCollapse);
        },

        /**
         * Registers a new docking panel type to be used later.
         * @function module:wcDocker#registerPanelType
         * @version 3.0.0
         * @param {String} name - The name identifier for the new panel type.
         * @param {module:wcDocker~registerOptions} options  An options object for describing the panel type.
         * @param {Boolean} [isPrivate] - <b>DEPRECATED:</b> Use [options.isPrivate]{@link wcDocker~registerOptions} instead.
         * @returns {Boolean} - Success or failure. Failure usually indicates the type name already exists.
         */
        registerPanelType: function (name, optionsOrCreateFunc, isPrivate) {

            var options = optionsOrCreateFunc;
            if (typeof options === 'function') {
                options = {
                    onCreate: optionsOrCreateFunc
                };
                console.log("WARNING: Passing in the creation function directly to wcDocker.registerPanelType parameter 2 is now deprecated and will be removed in the next version!  Please use the preferred options object instead.");
            }

            if (typeof isPrivate != 'undefined') {
                options.isPrivate = isPrivate;
                console.log("WARNING: Passing in the isPrivate flag to wcDocker.registerPanelType parameter 3 is now deprecated and will be removed in the next version!  Please use the preferred options object instead.");
            }

            if ($.isEmptyObject(options)) {
                options = null;
            }

            for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
                if (this._dockPanelTypeList[i].name === name) {
                    return false;
                }
            }

            this._dockPanelTypeList.push({
                name: name,
                options: options
            });

            var $menu = $('menu').find('menu');
            $menu.append($('<menuitem label="' + name + '">'));
            return true;
        },

        /**
         * Retrieves a list of all currently registered panel types.
         * @function module:wcDocker#panelTypes
         * @param {Boolean} includePrivate - If true, panels registered as private will also be included with this list.
         * @returns {String[]} - A list of panel type names.
         */
        panelTypes: function (includePrivate) {
            var result = [];
            for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
                if (includePrivate || !this._dockPanelTypeList[i].options.isPrivate) {
                    result.push(this._dockPanelTypeList[i].name);
                }
            }
            return result;
        },

        /**
         * Retrieves the options data associated with a given panel type when it was registered.
         * @function module:wcDocker#panelTypeInfo
         * @param {String} typeName - The name identifier of the panel.
         * @returns {module:wcDocker~registerOptions} - Registered options of the panel type, or false if the panel was not found.
         */
        panelTypeInfo: function (typeName) {
            for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
                if (this._dockPanelTypeList[i].name == typeName) {
                    return this._dockPanelTypeList[i].options;
                }
            }
            return false;
        },

        /**
         * Add a new docked panel to the docker instance.<br>
         * <b>Note:</b> It is best to use {@link wcDocker.COLLAPSED} after you have added your other docked panels, as it may ensure proper placement.
         * @function module:wcDocker#addPanel
         * @param {String} typeName - The name identifier of the panel to create.
         * @param {module:wcDocker.DOCK} location - The docking location to place this panel.
         * @param {module:wcPanel|module:wcDocker.COLLAPSED} [targetPanel] - A target panel to dock relative to, or use {@link wcDocker.COLLAPSED} to collapse it to the side or bottom.
         * @param {module:wcDocker~PanelOptions} [options] - Other options for panel placement.
         * @returns {module:wcPanel|Boolean} - The newly created panel object, or false if no panel was created.
         */
        addPanel: function (typeName, location, targetPanel, options) {
            function __addPanel(panel) {
                if (location === wcDocker.DOCK.STACKED) {
                    this.__addPanelGrouped(panel, targetPanel, options);
                } else {
                    this.__addPanelAlone(panel, location, targetPanel, options);
                }

                if (this._placeholderPanel && panel.moveable() &&
                    location !== wcDocker.DOCK.FLOAT &&
                    location !== wcDocker.DOCK.MODAL) {
                    if (this.removePanel(this._placeholderPanel)) {
                        this._placeholderPanel = null;
                    }
                }

                this.__forceUpdate();
            }

            // Find out if we have a persistent version of this panel type first.
            for (var a = 0; a < this._persistentList.length; ++a) {
                if (this._persistentList[a]._type === typeName) {
                    var panel = this._persistentList.splice(a, 1)[0];
                    __addPanel.call(this, panel);
                    panel.__trigger(wcDocker.EVENT.PERSISTENT_OPENED);
                    return panel;
                }
            }

            for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
                if (this._dockPanelTypeList[i].name === typeName) {
                    var panelType = this._dockPanelTypeList[i];

                    var panel = new (this.__getClass('wcPanel'))(this, typeName, panelType.options);
                    panel.__container(this.$transition);
                    var panelOptions = (panelType.options && panelType.options.options) || {};
                    panel._panelObject = new panelType.options.onCreate(panel, panelOptions);

                    __addPanel.call(this, panel);
                    return panel;
                }
            }
            return false;
        },

        /**
         * Removes a docked panel from the window.
         * @function module:wcDocker#removePanel
         * @param {module:wcPanel} panel - The panel to remove.
         * @param {Boolean} dontDestroy - If true, the panel itself will not be destroyed.
         * @returns {Boolean} - Success or failure.
         */
        removePanel: function (panel, dontDestroy) {
            if (!panel) {
                return false;
            }

            // Do not remove if this is the last moveable panel.
            var lastPanel = this.__isLastPanel(panel);

            var parentFrame = panel._parent;
            if (parentFrame && parentFrame.instanceOf('wcFrame')) {
                // Trigger the closing event, if any explicitely returned false, we cancel the close event.
                var results = panel.__trigger(wcDocker.EVENT.CLOSING);
                for (var i = 0; i < results.length; ++i) {
                    if (!results[i]) {
                        return false;
                    }
                }

                if (dontDestroy) {
                    // Keep the panel in a hidden transition container so as to not
                    // destroy any event handlers that may be on it.
                    panel.__container(this.$transition);
                    panel._parent = null;
                } else {
                    panel.__trigger(wcDocker.EVENT.CLOSED);
                }

                // If no more panels remain in this frame, remove the frame.
                if (!parentFrame.removePanel(panel) && !parentFrame.isCollapser()) {
                    // If this is the last frame, create a dummy panel to take up
                    // the space until another one is created.
                    if (lastPanel) {
                        this.__addPlaceholder(parentFrame);

                        if (!dontDestroy) {
                            panel.__destroy();
                        } else {
                            panel.__trigger(wcDocker.EVENT.PERSISTENT_CLOSED);
                        }
                        return true;
                    }

                    var index = this._floatingList.indexOf(parentFrame);
                    if (index !== -1) {
                        this._floatingList.splice(index, 1);
                    }
                    index = this._frameList.indexOf(parentFrame);
                    if (index !== -1) {
                        this._frameList.splice(index, 1);
                    }
                    index = this._modalList.indexOf(parentFrame);
                    if (index !== -1) {
                        this._modalList.splice(index, 1);
                    }

                    if (this._modalList.length) {
                        this.__focus(this._modalList[this._modalList.length - 1]);
                    } else if (this._floatingList.length) {
                        this.__focus(this._floatingList[this._floatingList.length - 1]);
                    }

                    var parentSplitter = parentFrame._parent;
                    if (parentSplitter && parentSplitter.instanceOf('wcSplitter')) {
                        parentSplitter.__removeChild(parentFrame);

                        var other;
                        if (parentSplitter.pane(0)) {
                            other = parentSplitter.pane(0);
                            parentSplitter._pane[0] = null;
                        } else {
                            other = parentSplitter.pane(1);
                            parentSplitter._pane[1] = null;
                        }

                        // Keep the panel in a hidden transition container so as to not
                        // destroy any event handlers that may be on it.
                        other.__container(this.$transition);
                        other._parent = null;

                        index = this._splitterList.indexOf(parentSplitter);
                        if (index !== -1) {
                            this._splitterList.splice(index, 1);
                        }

                        var parent = parentSplitter._parent;
                        parentContainer = parentSplitter.__container();
                        parentSplitter.__destroy();

                        if (parent && parent.instanceOf('wcSplitter')) {
                            parent.__removeChild(parentSplitter);
                            if (!parent.pane(0)) {
                                parent.pane(0, other);
                            } else {
                                parent.pane(1, other);
                            }
                        } else if (parent === this) {
                            this._root = other;
                            other._parent = this;
                            other.__container(parentContainer);
                        }
                        this.__update();
                    } else if (parentFrame === this._root) {
                        this._root = null;
                    }

                    if (this._focusFrame === parentFrame) {
                        this._focusFrame = null;
                    }

                    parentFrame.__destroy();
                }

                if (!dontDestroy) {
                    panel.__destroy();
                } else {
                    panel.__trigger(wcDocker.EVENT.PERSISTENT_CLOSED);
                }
                return true;
            }
            return false;
        },

        /**
         * Moves a docking panel from its current location to another.
         * @function module:wcDocker#movePanel
         * @param {module:wcPanel} panel - The panel to move.
         * @param {module:wcDocker.DOCK} location - The new docking location of the panel.
         * @param {module:wcPanel|wcDocker.COLLAPSED} [targetPanel] - A target panel to dock relative to, or use {@link wcDocker.COLLAPSED} to collapse it to the side or bottom.
         * @param {module:wcDocker~PanelOptions} [options] - Other options for panel placement.
         * @returns {module:wcPanel|Boolean} - The panel that was created, or false on failure.
         */
        movePanel: function (panel, location, targetPanel, options) {
            var lastPanel = this.__isLastPanel(panel);

            var $elem = panel.$container;
            if (panel._parent && panel._parent.instanceOf('wcFrame')) {
                $elem = panel._parent.$frame;
            }
            var offset = $elem.offset();
            var width = $elem.width();
            var height = $elem.height();

            var parentFrame = panel._parent;
            var floating = false;
            if (parentFrame && parentFrame.instanceOf('wcFrame')) {
                floating = parentFrame._isFloating;
                // Remove the panel from the frame.
                for (var i = 0; i < parentFrame._panelList.length; ++i) {
                    if (parentFrame._panelList[i] === panel) {
                        if (parentFrame.isCollapser()) {
                            parentFrame._curTab = -1;
                        } else if (parentFrame._curTab >= i) {
                            parentFrame._curTab--;
                        }

                        // Keep the panel in a hidden transition container so as to not
                        // destroy any event handlers that may be on it.
                        panel.__container(this.$transition);
                        panel._parent = null;

                        parentFrame._panelList.splice(i, 1);
                        break;
                    }
                }

                if (!parentFrame.isCollapser() && parentFrame._curTab === -1 && parentFrame._panelList.length) {
                    parentFrame._curTab = 0;
                }

                parentFrame.__updateTabs();
                parentFrame.collapse();

                // If no more panels remain in this frame, remove the frame.
                if (!parentFrame.isCollapser() && parentFrame._panelList.length === 0) {
                    // If this is the last frame, create a dummy panel to take up
                    // the space until another one is created.
                    if (lastPanel) {
                        this.__addPlaceholder(parentFrame);
                    } else {
                        var index = this._floatingList.indexOf(parentFrame);
                        if (index !== -1) {
                            this._floatingList.splice(index, 1);
                        }
                        index = this._frameList.indexOf(parentFrame);
                        if (index !== -1) {
                            this._frameList.splice(index, 1);
                        }

                        var parentSplitter = parentFrame._parent;
                        if (parentSplitter && parentSplitter.instanceOf('wcSplitter')) {
                            parentSplitter.__removeChild(parentFrame);

                            var other;
                            if (parentSplitter.pane(0)) {
                                other = parentSplitter.pane(0);
                                parentSplitter._pane[0] = null;
                            } else {
                                other = parentSplitter.pane(1);
                                parentSplitter._pane[1] = null;
                            }

                            if (targetPanel === parentSplitter) {
                                targetPanel._shift = other;
                            }

                            // Keep the item in a hidden transition container so as to not
                            // destroy any event handlers that may be on it.
                            other.__container(this.$transition);
                            other._parent = null;

                            index = this._splitterList.indexOf(parentSplitter);
                            if (index !== -1) {
                                this._splitterList.splice(index, 1);
                            }

                            var parent = parentSplitter._parent;
                            parentContainer = parentSplitter.__container();
                            parentSplitter.__destroy();

                            if (parent && parent.instanceOf('wcSplitter')) {
                                parent.__removeChild(parentSplitter);
                                if (!parent.pane(0)) {
                                    parent.pane(0, other);
                                } else {
                                    parent.pane(1, other);
                                }
                            } else if (parent === this) {
                                this._root = other;
                                other._parent = this;
                                other.__container(parentContainer);
                            }
                            this.__update();
                        }

                        if (this._focusFrame === parentFrame) {
                            this._focusFrame = null;
                        }

                        parentFrame.__destroy();
                    }
                }
            }

            panel.initSize(width, height);
            if (location === wcDocker.DOCK.STACKED) {
                this.__addPanelGrouped(panel, targetPanel, options);
            } else {
                this.__addPanelAlone(panel, location, targetPanel, options);
            }

            if (targetPanel == this._placeholderPanel) {
                this.removePanel(this._placeholderPanel);
                this._placeholderPanel = null;
            }

            var frame = panel._parent;
            if (frame && frame.instanceOf('wcFrame')) {
                if (frame._panelList.length === 1) {
                    frame.pos(offset.left + width / 2 + 20, offset.top + height / 2 + 20, true);
                }
            }

            this.__update(true);

            if (frame && frame.instanceOf('wcFrame')) {
                if (floating !== frame._isFloating) {
                    if (frame._isFloating) {
                        panel.__trigger(wcDocker.EVENT.DETACHED);
                    } else {
                        panel.__trigger(wcDocker.EVENT.ATTACHED);
                    }
                }
            }

            panel.__trigger(wcDocker.EVENT.MOVED);
            return panel;
        },

        /**
         * Finds all instances of a given panel type.
         * @function module:wcDocker#findPanels
         * @param {String} [typeName] - The name identifier for the panel. If not supplied, all panels are retrieved.
         * @returns {module:wcPanel[]} - A list of all panels found of the given type.
         */
        findPanels: function (typeName) {
            var result = [];
            for (var i = 0; i < this._frameList.length; ++i) {
                var frame = this._frameList[i];
                for (var a = 0; a < frame._panelList.length; ++a) {
                    var panel = frame._panelList[a];
                    if (!typeName || panel._type === typeName) {
                        result.push(panel);
                    }
                }
            }

            return result;
        },

        /**
         * Shows the loading screen.
         * @function module:wcDocker#startLoading
         * @param {String} [label] - An optional label to display.
         * @param {Number} [opacity=0.4] - If supplied, assigns a custom opacity value to the loading screen.
         * @param {Number} [textOpacity=1] - If supplied, assigns a custom opacity value to the loading icon and text displayed.
         */
        startLoading: function (label, opacity, textOpacity) {
            if (!this.$loading) {
                this.$loading = $('<div class="wcLoadingContainer"></div>');
                this.$outer.append(this.$loading);

                var $background = $('<div class="wcLoadingBackground"></div>');
                if (typeof opacity !== 'number') {
                    opacity = 0.4;
                }

                $background.css('opacity', opacity);
                this.$loading.append($background);

                var $icon = $('<div class="wcLoadingIconContainer"><i class="wcLoadingIcon ' + this._options.loadingClass + '"></i></div>');
                this.$loading.append($icon);

                if (label) {
                    var $label = $('<span class="wcLoadingLabel">' + label + '</span>');
                    this.$loading.append($label);
                }

                if (typeof textOpacity !== 'number') {
                    textOpacity = 1;
                }

                $icon.css('opacity', textOpacity);

                if ($label) {
                    $label.css('opacity', textOpacity);
                }
            }
        },

        /**
         * Hides the loading screen.
         * @function module:wcDocker#finishLoading
         * @param {Number} [fadeDuration=0] - The fade out duration for the loading screen.
         */
        finishLoading: function (fadeDuration) {
            if (this.$loading) {
                if (fadeDuration > 0) {
                    var self = this;
                    this.$loading.fadeOut(fadeDuration, function () {
                        self.$loading.remove();
                        self.$loading = null;
                    });
                } else {
                    this.$loading.remove();
                    this.$loading = null;
                }
            }
        },

        /**
         * Registers a global [event]{@link wcDocker.EVENT}.
         * @function module:wcDocker#on
         * @param {module:wcDocker.EVENT} eventType        - The event type, can be a custom event string or a [predefined event]{@link wcDocker.EVENT}.
         * @param {module:wcDocker~event:onEvent} handler  - A handler function to be called for the event.
         * @returns {Boolean} Success or failure that the event has been registered.
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
         * Unregisters a global [event]{@link wcDocker.EVENT}.
         * @function module:wcDocker#off
         * @param {module:wcDocker.EVENT} eventType          - The event type, can be a custom event string or a [predefined event]{@link wcDocker.EVENT}.
         * @param {module:wcDocker~event:onEvent} [handler]  - The handler function registered with the event. If omitted, all events registered to the event type are unregistered.
         */
        off: function (eventType, handler) {
            if (typeof eventType === 'undefined') {
                this._events = {};
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
         * Trigger an [event]{@link wcDocker.EVENT} on all panels.
         * @function module:wcDocker#trigger
         * @fires wcDocker~event:onEvent
         * @param {module:wcDocker.EVENT} eventType - The event type, can be a custom event string or a [predefined event]{@link wcDocker.EVENT}.
         * @param {Object} [data] - A custom data object to be passed along with the event.
         * @returns {Object[]} results - Returns an array with all results returned by event handlers.
         */
        trigger: function (eventName, data) {
            if (!eventName) {
                return false;
            }

            var results = [];

            for (var i = 0; i < this._frameList.length; ++i) {
                var frame = this._frameList[i];
                for (var a = 0; a < frame._panelList.length; ++a) {
                    var panel = frame._panelList[a];
                    results = results.concat(panel.__trigger(eventName, data));
                }
            }

            return results.concat(this.__trigger(eventName, data));
        },

        /**
         * Assigns a basic context menu to a selector element.  The context
         * Menu is a simple list of options, no nesting or special options.<br><br>
         *
         * If you wish to use a more complex context menu, you can use
         * [jQuery.contextMenu]{@link http://medialize.github.io/jQuery-contextMenu/docs.html} directly.
         * @function module:wcDocker#basicMenu
         * @deprecated Renamed to [wcDocker.menu}{@link wcDocker#menu}.
         * @param {external:jQuery~selector} selector                               - A selector string that designates the elements who use this menu.
         * @param {external:jQuery#contextMenu~item[]|Function} itemListOrBuildFunc - An array with each context menu item in it, or a function to call that returns one.
         * @param {Boolean} includeDefault                                          - If true, all default menu options will be included.
         */
        basicMenu: function (selector, itemListOrBuildFunc, includeDefault) {
            console.log('WARNING: wcDocker.basicMenu is deprecated, please use wcDocker.menu instead.');
            this.menu(selector, itemListOrBuildFunc, includeDefault);
        },

        /**
         * Assigns a basic context menu to a selector element.  The context
         * Menu is a simple list of options, no nesting or special options.<br><br>
         *
         * If you wish to use a more complex context menu, you can use
         * [jQuery.contextMenu]{@link http://medialize.github.io/jQuery-contextMenu/docs.html} directly.
         * @function module:wcDocker#menu
         * @param {external:jQuery~selector} selector                               - A selector string that designates the elements who use this menu.
         * @param {external:jQuery#contextMenu~item[]|Function} itemListOrBuildFunc - An array with each context menu item in it, or a function to call that returns one.
         * @param {Boolean} includeDefault                                          - If true, all default menu options will be included.
         */
        menu: function (selector, itemListOrBuildFunc, includeDefault) {
            var self = this;
            $.contextMenu({
                selector: selector,
                build: function ($trigger, event) {
                    var mouse = self.__mouse(event);
                    var myFrame;
                    for (var i = 0; i < self._frameList.length; ++i) {
                        var $frame = $trigger.hasClass('wcFrame') && $trigger || $trigger.parents('.wcFrame');
                        if (self._frameList[i].$frame[0] === $frame[0]) {
                            myFrame = self._frameList[i];
                            break;
                        }
                    }

                    var isTitle = false;
                    if ($(event.target).hasClass('wcTabScroller')) {
                        isTitle = true;
                    }

                    var windowTypes = {};
                    for (var i = 0; i < self._dockPanelTypeList.length; ++i) {
                        var type = self._dockPanelTypeList[i];
                        if (!type.options.isPrivate) {
                            if (type.options.limit > 0) {
                                if (self.findPanels(type.name).length >= type.options.limit) {
                                    continue;
                                }
                            }
                            var icon = null;
                            var faicon = null;
                            var label = type.name;
                            if (type.options) {
                                if (type.options.faicon) {
                                    faicon = type.options.faicon;
                                }
                                if (type.options.icon) {
                                    icon = type.options.icon;
                                }
                                if (type.options.title) {
                                    label = type.options.title;
                                }
                            }
                            windowTypes[type.name] = {
                                name: label,
                                icon: icon,
                                faicon: faicon,
                                className: 'wcMenuCreatePanel'
                            };
                        }
                    }

                    var separatorIndex = 0;
                    var finalItems = {};
                    var itemList = itemListOrBuildFunc;
                    if (typeof itemListOrBuildFunc === 'function') {
                        itemList = itemListOrBuildFunc($trigger, event);
                    }

                    for (var i = 0; i < itemList.length; ++i) {
                        if ($.isEmptyObject(itemList[i])) {
                            finalItems['sep' + separatorIndex++] = "---------";
                            continue;
                        }

                        var callback = itemList[i].callback;
                        if (callback) {
                            (function (listItem, callback) {
                                listItem.callback = function (key, opts) {
                                    var panel = null;
                                    var $frame = opts.$trigger.parents('.wcFrame').first();
                                    if ($frame.length) {
                                        for (var a = 0; a < self._frameList.length; ++a) {
                                            if ($frame[0] === self._frameList[a].$frame[0]) {
                                                panel = self._frameList[a].panel();
                                            }
                                        }
                                    }

                                    callback(key, opts, panel);
                                };
                            })(itemList[i], callback);
                        }
                        finalItems[itemList[i].name] = itemList[i];
                    }

                    var collapseTypes = {};
                    var defaultCollapse = '';
                    if (self.isCollapseEnabled()) {

                        var $icon = myFrame.$collapse.children('div');
                        if ($icon.hasClass('wcCollapseLeft')) {
                            defaultCollapse = ' wcCollapseLeft';
                        } else if ($icon.hasClass('wcCollapseRight')) {
                            defaultCollapse = ' wcCollapseRight';
                        } else {
                            defaultCollapse = ' wcCollapseBottom';
                        }

                        collapseTypes[wcDocker.DOCK.LEFT] = {
                            name: wcDocker.DOCK.LEFT,
                            faicon: 'sign-in wcCollapseLeft wcCollapsible'
                        };
                        collapseTypes[wcDocker.DOCK.RIGHT] = {
                            name: wcDocker.DOCK.RIGHT,
                            faicon: 'sign-in wcCollapseRight wcCollapsible'
                        };
                        collapseTypes[wcDocker.DOCK.BOTTOM] = {
                            name: wcDocker.DOCK.BOTTOM,
                            faicon: 'sign-in wcCollapseBottom wcCollapsible'
                        };
                    }

                    var items = finalItems;

                    if (includeDefault) {
                        if (!$.isEmptyObject(finalItems)) {
                            items['sep' + separatorIndex++] = "---------";
                        }

                        if (isTitle) {
                            items['Close Panel'] = {
                                name: 'Remove Panel',
                                faicon: 'close',
                                disabled: !myFrame.panel().closeable()
                            };
                            if (self.isCollapseEnabled()) {
                                if (!myFrame.isCollapser()) {
                                    items.fold1 = {
                                        name: 'Collapse Panel',
                                        faicon: 'sign-in' + defaultCollapse + ' wcCollapsible',
                                        items: collapseTypes,
                                        disabled: !myFrame.panel().moveable()
                                    }
                                } else {
                                    items['Attach Panel'] = {
                                        name: 'Dock Panel',
                                        faicon: 'sign-out' + defaultCollapse + ' wcCollapsed',
                                        disabled: !myFrame.panel().moveable()
                                    }
                                }
                            }
                            if (!myFrame._isFloating) {
                                items['Detach Panel'] = {
                                    name: 'Detach Panel',
                                    faicon: 'level-up',
                                    disabled: !myFrame.panel().moveable() || !myFrame.panel().detachable() || myFrame.panel()._isPlaceholder
                                };
                            }

                            items['sep' + separatorIndex++] = "---------";

                            items.fold2 = {
                                name: 'Add Panel',
                                faicon: 'columns',
                                items: windowTypes,
                                disabled: !(myFrame.panel()._titleVisible && (!myFrame._isFloating || self._modalList.indexOf(myFrame) === -1)),
                                className: 'wcMenuCreatePanel'
                            };
                        } else {
                            if (myFrame) {
                                items['Close Panel'] = {
                                    name: 'Remove Panel',
                                    faicon: 'close',
                                    disabled: !myFrame.panel().closeable()
                                };
                                if (self.isCollapseEnabled()) {
                                    if (!myFrame.isCollapser()) {
                                        items.fold1 = {
                                            name: 'Collapse Panel',
                                            faicon: 'sign-in' + defaultCollapse + ' wcCollapsible',
                                            items: collapseTypes,
                                            disabled: !myFrame.panel().moveable()
                                        }
                                    } else {
                                        items['Attach Panel'] = {
                                            name: 'Dock Panel',
                                            faicon: 'sign-out' + defaultCollapse + ' wcCollapsed',
                                            disabled: !myFrame.panel().moveable()
                                        }
                                    }
                                }
                                if (!myFrame._isFloating) {
                                    items['Detach Panel'] = {
                                        name: 'Detach Panel',
                                        faicon: 'level-up',
                                        disabled: !myFrame.panel().moveable() || !myFrame.panel().detachable() || myFrame.panel()._isPlaceholder
                                    };
                                }

                                items['sep' + separatorIndex++] = "---------";
                            }

                            items.fold2 = {
                                name: 'Add Panel',
                                faicon: 'columns',
                                items: windowTypes,
                                disabled: !(!myFrame || (!myFrame._isFloating && myFrame.panel().moveable())),
                                className: 'wcMenuCreatePanel'
                            };
                        }

                        if (myFrame && !myFrame._isFloating && myFrame.panel().moveable()) {
                            var rect = myFrame.__rect();
                            self._ghost = new (self.__getClass('wcGhost'))(rect, mouse, self);
                            myFrame.__checkAnchorDrop(mouse, false, self._ghost, true, false, false);
                            self._ghost.$ghost.hide();
                        }
                    }

                    return {
                        callback: function (key, options) {
                            if (key === 'Close Panel') {
                                setTimeout(function () {
                                    myFrame.panel().close();
                                }, 10);
                            } else if (key === 'Detach Panel') {
                                self.movePanel(myFrame.panel(), wcDocker.DOCK.FLOAT, false);
                            } else if (key === 'Attach Panel') {
                                var $icon = myFrame.$collapse.children('div');
                                var position = wcDocker.DOCK.BOTTOM;
                                if ($icon.hasClass('wcCollapseLeft')) {
                                    position = wcDocker.DOCK.LEFT;
                                } else if ($icon.hasClass('wcCollapseRight')) {
                                    position = wcDocker.DOCK.RIGHT;
                                }
                                var opts = {};
                                switch (position) {
                                    case wcDocker.DOCK.LEFT:
                                        opts.w = myFrame.$frame.width();
                                        break;
                                    case wcDocker.DOCK.RIGHT:
                                        opts.w = myFrame.$frame.width();
                                        break;
                                    case wcDocker.DOCK.BOTTOM:
                                        opts.h = myFrame.$frame.height();
                                        break;
                                }
                                var target = self._collapser[wcDocker.DOCK.LEFT]._parent.right();
                                myFrame.collapse(true);
                                self.movePanel(myFrame.panel(), position, target, opts);
                            } else if (key === wcDocker.DOCK.LEFT) {
                                self.movePanel(myFrame.panel(), wcDocker.DOCK.LEFT, wcDocker.COLLAPSED);
                            } else if (key === wcDocker.DOCK.RIGHT) {
                                self.movePanel(myFrame.panel(), wcDocker.DOCK.RIGHT, wcDocker.COLLAPSED);
                            } else if (key === wcDocker.DOCK.BOTTOM) {
                                self.movePanel(myFrame.panel(), wcDocker.DOCK.BOTTOM, wcDocker.COLLAPSED);
                            } else {
                                if (self._ghost && (myFrame)) {
                                    var anchor = self._ghost.anchor();
                                    var target = myFrame.panel();
                                    if (anchor.item) {
                                        target = anchor.item._parent;
                                    }
                                    var newPanel = self.addPanel(key, anchor.loc, target, self._ghost.rect());
                                    newPanel.focus();
                                }
                            }
                        },
                        events: {
                            show: function (opt) {
                                (function (items) {

                                    // Whenever them menu is shown, we update and add the faicons.
                                    // Grab all those menu items, and propogate a list with them.
                                    var menuItems = {};
                                    var options = opt.$menu.find('.context-menu-item');
                                    for (var i = 0; i < options.length; ++i) {
                                        var $option = $(options[i]);
                                        var $span = $option.find('span');
                                        if ($span.length) {
                                            menuItems[$span[0].innerHTML] = $option;
                                        }
                                    }

                                    // function calls itself so that we get nice icons inside of menus as well.
                                    (function recursiveIconAdd(items) {
                                        for (var it in items) {
                                            var item = items[it];
                                            var $menu = menuItems[item.name];

                                            if ($menu) {
                                                var $icon = $('<div class="wcMenuIcon">');
                                                $menu.prepend($icon);

                                                if (item.icon) {
                                                    $icon.addClass(item.icon);
                                                }

                                                if (item.faicon) {
                                                    $icon.addClass('fa fa-menu fa-' + item.faicon + ' fa-lg fa-fw');
                                                }

                                                // Custom submenu arrow.
                                                if ($menu.hasClass('context-menu-submenu')) {
                                                    var $expander = $('<div class="wcMenuSubMenu fa fa-caret-right fa-lg">');
                                                    $menu.append($expander);
                                                }
                                            }

                                            // Iterate through sub-menus.
                                            if (item.items) {
                                                recursiveIconAdd(item.items);
                                            }
                                        }
                                    })(items);

                                })(items);
                            },
                            hide: function (opt) {
                                if (self._ghost) {
                                    self._ghost.destroy();
                                    self._ghost = false;
                                }
                            }
                        },
                        animation: {duration: 250, show: 'fadeIn', hide: 'fadeOut'},
                        reposition: false,
                        autoHide: true,
                        zIndex: 200,
                        items: items
                    };
                }
            });
        },

        /**
         * Bypasses the next context menu event.
         * Use this during a mouse up event in which you do not want the
         * context menu to appear when it normally would have.
         * @function module:wcDocker#bypassMenu
         */
        bypassMenu: function () {
            if (this._menuTimer) {
                clearTimeout(this._menuTimer);
            }

            for (var i in $.contextMenu.menus) {
                var menuSelector = $.contextMenu.menus[i].selector;
                $(menuSelector).contextMenu(false);
            }

            var self = this;
            this._menuTimer = setTimeout(function () {
                for (var i in $.contextMenu.menus) {
                    var menuSelector = $.contextMenu.menus[i].selector;
                    $(menuSelector).contextMenu(true);
                }
                self._menuTimer = null;
            }, 0);
        },

        /**
         * Saves the current panel configuration into a serialized
         * string that can be used later to restore it.
         * @function module:wcDocker#save
         * @returns {String} - A serialized string that describes the current panel configuration.
         */
        save: function () {
            var data = {};

            data.floating = [];
            for (var i = 0; i < this._floatingList.length; ++i) {
                data.floating.push(this._floatingList[i].__save());
            }

            data.root = this._root.__save();

            if (!$.isEmptyObject(this._collapser)) {
                data.collapsers = {
                    left: this._collapser[wcDocker.DOCK.LEFT].__save(),
                    right: this._collapser[wcDocker.DOCK.RIGHT].__save(),
                    bottom: this._collapser[wcDocker.DOCK.BOTTOM].__save()
                };
            }

            return JSON.stringify(data, function (key, value) {
                if (value == Infinity) {
                    return "Infinity";
                }
                return value;
            });
        },

        /**
         * Restores a previously saved configuration.
         * @function module:wcDocker#restore
         * @param {String} dataString - A previously saved serialized string, See [wcDocker.save]{@link wcDocker#save}.
         */
        restore: function (dataString) {
            var data = JSON.parse(dataString, function (key, value) {
                if (value === 'Infinity') {
                    return Infinity;
                }
                return value;
            });

            this.clear();

            this._root = this.__create(data.root, this, this.$container);
            this._root.__restore(data.root, this);

            for (var i = 0; i < data.floating.length; ++i) {
                var panel = this.__create(data.floating[i], this, this.$container);
                panel.__restore(data.floating[i], this);
            }

            this.__forceUpdate(false);

            if (!$.isEmptyObject(data.collapsers) && this.isCollapseEnabled()) {
                this.__initCollapsers();

                this._collapser[wcDocker.DOCK.LEFT].__restore(data.collapsers.left, this);
                this._collapser[wcDocker.DOCK.RIGHT].__restore(data.collapsers.right, this);
                this._collapser[wcDocker.DOCK.BOTTOM].__restore(data.collapsers.bottom, this);

                var self = this;
                setTimeout(function () {
                    self.__forceUpdate();
                });
            }
        },

        /**
         * Clears all contents from the docker instance.
         * @function module:wcDocker#clear
         */
        clear: function () {
            this._root = null;

            // Make sure we notify all panels that they are closing.
            this.trigger(wcDocker.EVENT.CLOSED);

            for (var i = 0; i < this._splitterList.length; ++i) {
                this._splitterList[i].__destroy();
            }

            for (var i = 0; i < this._frameList.length; ++i) {
                this._frameList[i].__destroy();
            }

            if (!$.isEmptyObject(this._collapser)) {
                this._collapser[wcDocker.DOCK.LEFT].__destroy();
                this._collapser[wcDocker.DOCK.RIGHT].__destroy();
                this._collapser[wcDocker.DOCK.BOTTOM].__destroy();
                this._collapser = {};
            }

            while (this._frameList.length) this._frameList.pop();
            while (this._floatingList.length) this._floatingList.pop();
            while (this._splitterList.length) this._splitterList.pop();

            this.off();
        },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

        __init: function () {
            var self = this;

            this.__compatibilityCheck();

            this._root = null;
            this.__addPlaceholder();

            // Setup our context menus.
            if (this._options.allowContextMenu) {
                this.menu('.wcFrame', [], true);
            }

            this.theme(this._options.theme);

            // Set up our responsive updater.
            this._updateId = setInterval(function () {
                if (self._dirty) {
                    self._dirty = false;
                    if (self._root) {
                        self._root.__update(self._dirtyDontMove);
                    }

                    for (var i = 0; i < self._floatingList.length; ++i) {
                        self._floatingList[i].__update();
                    }
                }
            }, this._options.responseRate);

            $(window).resize(this.__resize.bind(this));
            // $('body').on('contextmenu', 'a, img', __onContextShowNormal);
            $('body').on('contextmenu', '.wcSplitterBar', __onContextDisable);

            // $('body').on('selectstart', '.wcFrameTitleBar, .wcPanelTab, .wcFrameButton', function(event) {
            //   event.preventDefault();
            // });

            // Hovering over a panel creation context menu.
            $('body').on('mouseenter', '.wcMenuCreatePanel', __onEnterCreatePanel);
            $('body').on('mouseleave', '.wcMenuCreatePanel', __onLeaveCreatePanel);

            // Mouse move will allow you to move an object that is being dragged.
            $('body').on('mousemove', __onMouseMove);
            $('body').on('touchmove', __onMouseMove);
            // A catch all on mouse down to record the mouse origin position.
            $('body').on('mousedown', __onMouseDown);
            $('body').on('touchstart', __onMouseDown);
            $('body').on('mousedown', '.wcModalBlocker', __onMouseDownModalBlocker);
            $('body').on('touchstart', '.wcModalBlocker', __onMouseDownModalBlocker);
            // On some browsers, clicking and dragging a tab will drag it's graphic around.
            // Here I am disabling this as it interferes with my own drag-drop.
            $('body').on('mousedown', '.wcPanelTab', __onPreventDefault);
            $('body').on('touchstart', '.wcPanelTab', __onPreventDefault);
            $('body').on('mousedown', '.wcFrameButtonBar > .wcFrameButton', __onMouseSelectionBlocker);
            $('body').on('touchstart', '.wcFrameButtonBar > .wcFrameButton', __onMouseSelectionBlocker);
            // Mouse down on a frame title will allow you to move them.
            $('body').on('mousedown', '.wcFrameTitleBar', __onMouseDownFrameTitle);
            $('body').on('touchstart', '.wcFrameTitleBar', __onMouseDownFrameTitle);
            // Mouse down on a splitter bar will allow you to resize them.
            $('body').on('mousedown', '.wcSplitterBar', __onMouseDownSplitter);
            $('body').on('touchstart', '.wcSplitterBar', __onMouseDownSplitter);
            // Middle mouse button on a panel tab to close it.
            $('body').on('mousedown', '.wcPanelTab', __onMouseDownPanelTab);
            $('body').on('touchstart', '.wcPanelTab', __onMouseDownPanelTab);
            // Middle mouse button on a panel tab to close it.
            $('body').on('mouseup', '.wcPanelTab', __onReleasePanelTab);
            $('body').on('touchend', '.wcPanelTab', __onReleasePanelTab);
            // Mouse down on a panel will put it into focus.
            $('body').on('mousedown', '.wcLayout', __onMouseDownLayout);
            $('body').on('touchstart', '.wcLayout', __onMouseDownLayout);
            // Floating frames have resizable edges.
            $('body').on('mousedown', '.wcFrameEdge', __onMouseDownResizeFrame);
            $('body').on('touchstart', '.wcFrameEdge', __onMouseDownResizeFrame);
            // Create new panels.
            $('body').on('mousedown', '.wcCreatePanel', __onMouseDownCreatePanel);
            $('body').on('touchstart', '.wcCreatePanel', __onMouseDownCreatePanel);
            // Mouse released
            $('body').on('mouseup', __onMouseUp);
            $('body').on('touchend', __onMouseUp);

            // Clicking on a custom tab button.
            $('body').on('click', '.wcCustomTab .wcFrameButton', __onClickCustomTabButton);
            // Clicking on a panel frame button.
            $('body').on('click', '.wcFrameButtonBar > .wcFrameButton', __onClickPanelButton);

            // Escape key to cancel drag operations.
            $('body').on('keyup', __onKeyup);

            // on mousedown
            function __onMouseDown(event) {
                var mouse = self.__mouse(event);
                self._mouseOrigin.x = mouse.x;
                self._mouseOrigin.y = mouse.y;
            }

            // on mouseup
            function __onMouseUp(event) {
                var mouse = self.__mouse(event);
                if (mouse.which === 3) {
                    return true;
                }
                $('body').removeClass('wcDisableSelection');
                if (self._draggingFrame) {
                    for (var i = 0; i < self._frameList.length; ++i) {
                        self._frameList[i].__shadow(false);
                    }
                }

                if (self._ghost && (self._draggingFrame || self._creatingPanel)) {
                    var anchor = self._ghost.anchor();

                    if (self._draggingFrame) {
                        if (!anchor) {
                            if (!self._draggingFrameTab) {
                                self._draggingFrame.panel(0);
                            }

                            var panel = self._draggingFrame.panel(parseInt($(self._draggingFrameTab).attr('id')));
                            self.movePanel(panel, wcDocker.DOCK.FLOAT, null, self._ghost.__rect());
                            // Dragging the entire frame.
                            if (!self._draggingFrameTab) {
                                var count = self._draggingFrame._panelList.length;
                                if (count > 1 || self._draggingFrame.panel() !== self._placeholderPanel) {
                                    for (var i = 0; i < count; ++i) {
                                        self.movePanel(self._draggingFrame.panel(), wcDocker.DOCK.STACKED, panel, {tabOrientation: self._draggingFrame._tabOrientation});
                                    }
                                }
                            }

                            var frame = panel._parent;
                            if (frame && frame.instanceOf('wcFrame')) {
                                frame.pos(mouse.x, mouse.y + self._ghost.__rect().h / 2 - 10, true);

                                frame._size.x = self._ghost.__rect().w;
                                frame._size.y = self._ghost.__rect().h;
                            }

                            frame.__update();
                            self.__focus(frame);
                        } else if (!anchor.self && anchor.loc !== undefined) {
                            // Changing tab location on the same frame.
                            if (anchor.tab && anchor.item._parent._parent == self._draggingFrame) {
                                self._draggingFrame.tabOrientation(anchor.tab);
                            } else {
                                var index = 0;
                                if (self._draggingFrameTab) {
                                    index = parseInt($(self._draggingFrameTab).attr('id'));
                                } else {
                                    self._draggingFrame.panel(0);
                                }
                                var panel;
                                if (anchor.item) {
                                    panel = anchor.item._parent;
                                }
                                // If we are dragging a tab to split its own container, find another
                                // tab item within the same frame and split from there.
                                if (self._draggingFrame._panelList.indexOf(panel) > -1) {
                                    // Can not split the frame if it is the only panel inside.
                                    if (self._draggingFrame._panelList.length === 1) {
                                        return;
                                    }
                                    for (var i = 0; i < self._draggingFrame._panelList.length; ++i) {
                                        if (panel !== self._draggingFrame._panelList[i]) {
                                            panel = self._draggingFrame._panelList[i];
                                            index--;
                                            break;
                                        }
                                    }
                                }
                                var movingPanel = null;
                                if (self._draggingFrameTab) {
                                    movingPanel = self._draggingFrame.panel(parseInt($(self._draggingFrameTab).attr('id')));
                                } else {
                                    movingPanel = self._draggingFrame.panel();
                                }
                                panel = self.movePanel(movingPanel, anchor.loc, panel, self._ghost.rect());
                                panel._parent.panel(panel._parent._panelList.length - 1, true);
                                // Dragging the entire frame.
                                if (!self._draggingFrameTab) {
                                    var rect = self._ghost.rect();
                                    if (!rect.tabOrientation) {
                                        rect.tabOrientation = self._draggingFrame.tabOrientation();
                                    }
                                    var count = self._draggingFrame._panelList.length;
                                    if (count > 1 || self._draggingFrame.panel() !== self._placeholderPanel) {
                                        for (var i = 0; i < count; ++i) {
                                            self.movePanel(self._draggingFrame.panel(), wcDocker.DOCK.STACKED, panel, rect);
                                        }
                                    }
                                } else {
                                    var frame = panel._parent;
                                    if (frame && frame.instanceOf('wcFrame')) {
                                        index = index + frame._panelList.length;
                                    }
                                }

                                var frame = panel._parent;
                                if (frame && frame.instanceOf('wcFrame')) {
                                    frame.panel(index);
                                }
                                self.__focus(frame);
                            }
                        }
                    } else if (self._creatingPanel) {
                        var loc = wcDocker.DOCK.FLOAT;
                        var target = null;
                        if (anchor) {
                            loc = anchor.loc;
                            if (anchor.item) {
                                target = anchor.item._parent;
                            } else {
                                target = anchor.panel;
                            }
                        }
                        self.addPanel(self._creatingPanel, loc, target, self._ghost.rect());
                    }

                    self._ghost.destroy();
                    self._ghost = null;

                    self.trigger(wcDocker.EVENT.END_DOCK);
                    self.__update();
                }

                if (self._draggingSplitter) {
                    self._draggingSplitter.$pane[0].removeClass('wcResizing');
                    self._draggingSplitter.$pane[1].removeClass('wcResizing');
                }

                self._creatingPanel = false;
                self._draggingSplitter = null;
                self._draggingFrame = null;
                self._draggingFrameSizer = null;
                self._draggingFrameTab = null;
                self._draggingFrameTopper = false;
                self._draggingCustomTabFrame = null;
                self._removingPanel = null;
                return true;
            }

            // on mousemove
            var lastMouseMove = new Date().getTime();
            var lastMouseEvent = null;
            var moveTimeout = 0;
            var lastLButtonDown = 0;

            function __onMouseMove(event) {
                lastMouseEvent = event;
                var mouse = self.__mouse(event);
                if (mouse.which === 3 || (
                    !self._draggingSplitter && !self._draggingFrameSizer && !self._draggingCustomTabFrame && !self._ghost && !self._draggingFrame && !self._draggingFrameTab)) {
                    return true;
                }

                var t = new Date().getTime();
                if (t - lastMouseMove < self._options.responseRate) {
                    if (!moveTimeout) {
                        moveTimeout = setTimeout(function () {
                            lastMouseMove = 0;
                            moveTimeout = 0;
                            __onMouseMove(lastMouseEvent);
                        }, self._options.responseRate);
                    }
                    return true;
                }
                lastMouseMove = new Date().getTime();

                if (self._draggingSplitter) {
                    self._draggingSplitter.__moveBar(mouse);
                } else if (self._draggingFrameSizer) {
                    var offset = self.$container.offset();
                    mouse.x += offset.left;
                    mouse.y += offset.top;

                    self._draggingFrame.__resize(self._draggingFrameSizer, mouse);
                    self._draggingFrame.__update();
                } else if (self._draggingCustomTabFrame) {
                    if (self._draggingCustomTabFrame.moveable()) {
                        var $hoverTab = $(event.target).hasClass('wcPanelTab') ? $(event.target) : $(event.target).parents('.wcPanelTab');
                        if (self._draggingFrameTab && $hoverTab && $hoverTab.length && self._draggingFrameTab !== event.target) {
                            self._draggingFrameTab = self._draggingCustomTabFrame.moveTab(parseInt($(self._draggingFrameTab).attr('id')), parseInt($hoverTab.attr('id')));
                        }
                    }
                } else if (self._ghost) {
                    if (self._draggingFrame) {
                        self._ghost.__move(mouse);
                        var forceFloat = !(self._draggingFrame._isFloating || mouse.which === 1);
                        var found = false;

                        // Check anchoring with self.
                        if (!self._draggingFrame.__checkAnchorDrop(mouse, true, self._ghost, self._draggingFrame._panelList.length > 1 && self._draggingFrameTab, self._draggingFrameTopper, !self.__isLastFrame(self._draggingFrame))) {
                            // Introduce a delay before a panel begins movement to a new docking position.
                            if (new Date().getTime() - lastLButtonDown < self._options.moveStartDelay) {
                                return;
                            }
                            self._draggingFrame.__shadow(true);
                            self.__focus();
                            if (!forceFloat) {
                                for (var i = 0; i < self._frameList.length; ++i) {
                                    if (self._frameList[i] !== self._draggingFrame) {
                                        if (self._frameList[i].__checkAnchorDrop(mouse, false, self._ghost, true, self._draggingFrameTopper, !self.__isLastFrame(self._draggingFrame))) {
                                            self._draggingFrame.__shadow(true);
                                            return;
                                        }
                                    }
                                }
                            }

                            if (self._draggingFrame.panel().detachable()) {
                                self._ghost.anchor(mouse, null);
                            }
                        } else {
                            self._draggingFrame.__shadow(false);
                            var $target = $(document.elementFromPoint(mouse.x, mouse.y));
                            var $hoverTab = $target.hasClass('wcPanelTab') ? $target : $target.parents('.wcPanelTab');
                            if (self._draggingFrameTab && $hoverTab.length && self._draggingFrameTab !== $hoverTab[0]) {
                                self._draggingFrameTab = self._draggingFrame.__tabMove(parseInt($(self._draggingFrameTab).attr('id')), parseInt($hoverTab.attr('id')));
                            }
                        }
                    } else if (self._creatingPanel) {
                        self._ghost.update(mouse, !self._creatingPanelNoFloating);
                    }
                } else if (self._draggingFrame && !self._draggingFrameTab) {
                    self._draggingFrame.__move(mouse);
                    self._draggingFrame.__update();
                }
                return true;
            }

            // on contextmenu for a, img
            function __onContextShowNormal() {
                if (self._contextTimer) {
                    clearTimeout(self._contextTimer);
                }

                $(".wcFrame").contextMenu(false);
                self._contextTimer = setTimeout(function () {
                    $(".wcFrame").contextMenu(true);
                    self._contextTimer = null;
                }, 100);
                return true;
            }

            // on contextmenu for .wcSplitterBar
            function __onContextDisable() {
                return false;
            }

            // on mouseenter for .wcMenuCreatePanel
            function __onEnterCreatePanel() {
                if (self._ghost) {
                    self._ghost.$ghost.stop().fadeIn(200);
                }
            }

            // on mouseleave for .wcMenuCreatePanel
            function __onLeaveCreatePanel() {
                if (self._ghost) {
                    self._ghost.$ghost.stop().fadeOut(200);
                }
            }

            // on mousedown for .wcModalBlocker
            function __onMouseDownModalBlocker(event) {
                // for (var i = 0; i < self._modalList.length; ++i) {
                //   self._modalList[i].__focus(true);
                // }
                if (self._modalList.length) {
                    self._modalList[self._modalList.length - 1].__focus(true);
                }
            }

            // on mousedown for .wcPanelTab
            function __onPreventDefault(event) {
                event.preventDefault();
                event.returnValue = false;
            }

            // on mousedown for .wcFrameButtonBar > .wcFrameButton
            function __onMouseSelectionBlocker() {
                $('body').addClass('wcDisableSelection');
            }

            // on click for .wcCustomTab .wcFrameButton
            function __onClickCustomTabButton(event) {
                $('body').removeClass('wcDisableSelection');
                for (var i = 0; i < self._tabList.length; ++i) {
                    var customTab = self._tabList[i];
                    if (customTab.$close[0] === this) {
                        var tabIndex = customTab.tab();
                        customTab.removeTab(tabIndex);
                        event.stopPropagation();
                        return;
                    }

                    if (customTab.$tabLeft[0] === this) {
                        customTab._tabScrollPos -= customTab.$tabBar.width() / 2;
                        if (customTab._tabScrollPos < 0) {
                            customTab._tabScrollPos = 0;
                        }
                        customTab.__updateTabs();
                        event.stopPropagation();
                        return;
                    }
                    if (customTab.$tabRight[0] === this) {
                        customTab._tabScrollPos += customTab.$tabBar.width() / 2;
                        customTab.__updateTabs();
                        event.stopPropagation();
                        return;
                    }
                }
            }

            // on click for .wcFrameButtonBar > .wcFrameButton
            function __onClickPanelButton() {
                $('body').removeClass('wcDisableSelection');
                for (var i = 0; i < self._frameList.length; ++i) {
                    var frame = self._frameList[i];
                    if (frame.$close[0] === this) {
                        self.__closePanel(frame.panel());
                        return;
                    }
                    if (frame.$collapse[0] === this) {
                        var $icon = frame.$collapse.children('div');
                        var position = wcDocker.DOCK.BOTTOM;
                        if ($icon.hasClass('wcCollapseLeft')) {
                            position = wcDocker.DOCK.LEFT;
                        } else if ($icon.hasClass('wcCollapseRight')) {
                            position = wcDocker.DOCK.RIGHT;
                        }
                        if (frame.isCollapser()) {
                            // Un-collapse
                            // var target;
                            var opts = {};
                            switch (position) {
                                case wcDocker.DOCK.LEFT:
                                    // target = frame._parent._parent.right();
                                    opts.w = frame.$frame.width();
                                    break;
                                case wcDocker.DOCK.RIGHT:
                                    // target = frame._parent._parent.left();
                                    opts.w = frame.$frame.width();
                                    break;
                                case wcDocker.DOCK.BOTTOM:
                                    // target = frame._parent._parent.top();
                                    opts.h = frame.$frame.height();
                                    break;
                            }
                            var target = self._collapser[wcDocker.DOCK.LEFT]._parent.right();
                            frame.collapse(true);
                            self.movePanel(frame.panel(), position, target, opts);
                        } else {
                            // collapse.
                            self.movePanel(frame.panel(), position, wcDocker.COLLAPSED);
                        }
                        self.__update();
                        return;
                    }
                    if (frame.$tabLeft[0] === this) {
                        frame._tabScrollPos -= frame.$tabBar.width() / 2;
                        if (frame._tabScrollPos < 0) {
                            frame._tabScrollPos = 0;
                        }
                        frame.__updateTabs();
                        return;
                    }
                    if (frame.$tabRight[0] === this) {
                        frame._tabScrollPos += frame.$tabBar.width() / 2;
                        frame.__updateTabs();
                        return;
                    }

                    for (var a = 0; a < frame._buttonList.length; ++a) {
                        if (frame._buttonList[a][0] === this) {
                            var $button = frame._buttonList[a];
                            var result = {
                                name: $button.data('name'),
                                isToggled: false
                            };

                            if ($button.hasClass('wcFrameButtonToggler')) {
                                $button.toggleClass('wcFrameButtonToggled');
                                if ($button.hasClass('wcFrameButtonToggled')) {
                                    result.isToggled = true;
                                }
                            }

                            var panel = frame.panel();
                            panel.buttonState(result.name, result.isToggled);
                            panel.__trigger(wcDocker.EVENT.BUTTON, result);
                            return;
                        }
                    }
                }
            }

            // on mouseup for .wcPanelTab
            function __onReleasePanelTab(event) {
                var mouse = self.__mouse(event);
                if (mouse.which !== 2) {
                    return;
                }

                var index = parseInt($(this).attr('id'));

                for (var i = 0; i < self._frameList.length; ++i) {
                    var frame = self._frameList[i];
                    if (frame.$tabBar[0] === $(this).parents('.wcFrameTitleBar')[0]) {
                        var panel = frame._panelList[index];
                        if (self._removingPanel === panel) {
                            self.removePanel(panel);
                            self.__update();
                        }
                        return;
                    }
                }
            }

            // on mousedown for .wcSplitterBar
            function __onMouseDownSplitter(event) {
                var mouse = self.__mouse(event);
                if (mouse.which !== 1) {
                    return true;
                }

                $('body').addClass('wcDisableSelection');
                for (var i = 0; i < self._splitterList.length; ++i) {
                    if (self._splitterList[i].$bar[0] === this) {
                        self._draggingSplitter = self._splitterList[i];
                        self._draggingSplitter.$pane[0].addClass('wcResizing');
                        self._draggingSplitter.$pane[1].addClass('wcResizing');
                        event.preventDefault();
                        break;
                    }
                }
                return true;
            }

            // on mousedown for .wcFrameTitleBar
            function __onMouseDownFrameTitle(event) {
                var mouse = self.__mouse(event);
                if (mouse.which === 3) {
                    return true;
                }
                // Skip frame buttons, they are handled elsewhere (Buttons may also have a child image or span so we check parent as well);
                if ($(event.target).hasClass('wcFrameButton') || $(event.target).parents('.wcFrameButton').length) {
                    return true;
                }

                lastLButtonDown = new Date().getTime();

                $('body').addClass('wcDisableSelection');
                for (var i = 0; i < self._frameList.length; ++i) {
                    if (self._frameList[i].$titleBar[0] == this ||
                        self._frameList[i].$tabBar[0] == this) {
                        self._draggingFrame = self._frameList[i];

                        self._draggingFrame.__anchorMove(mouse);

                        var $panelTab = $(event.target).hasClass('wcPanelTab') ? $(event.target) : $(event.target).parents('.wcPanelTab');
                        if ($panelTab && $panelTab.length) {
                            var index = parseInt($panelTab.attr('id'));
                            self._draggingFrame.panel(index, true);
                            self._draggingFrameTab = $panelTab[0];
                            $(window).focus();
                        }

                        // If the window is able to be docked, give it a dark shadow tint and begin the movement process
                        var shouldMove = true;
                        if (self._draggingFrameTab) {
                            if ($panelTab.hasClass('wcNotMoveable')) {
                                shouldMove = false;
                            }
                        } else {
                            if (self._draggingFrame._isFloating && mouse.which === 1) {
                                shouldMove = false;
                            }
                        }

                        // if (((!$panelTab.hasClass('wcNotMoveable') && self._draggingFrameTab) ||
                        //     !(self._draggingFrame.$titleBar.hasClass('wcNotMoveable') || self._draggingFrame.$tabBar.hasClass('wcNotMoveable'))) &&
                        //     (!self._draggingFrame._isFloating || mouse.which !== 1 || self._draggingFrameTab)) {
                        if (shouldMove) {
                            // Special case to allow users to drag out only a single collapsed tab even by dragging the title bar (which normally would drag out the entire frame).
                            if (!self._draggingFrameTab && self._draggingFrame.isCollapser()) {
                                self._draggingFrameTab = self._draggingFrame.panel();
                            }
                            self._draggingFrameTopper = $(event.target).parents('.wcFrameTopper').length > 0;
                            var rect = self._draggingFrame.__rect();
                            self._ghost = new (self.__getClass('wcGhost'))(rect, mouse, self);
                            self._draggingFrame.__checkAnchorDrop(mouse, true, self._ghost, true, self._draggingFrameTopper, !self.__isLastFrame(self._draggingFrame));
                            self.trigger(wcDocker.EVENT.BEGIN_DOCK);
                        }
                        break;
                    }
                }
                for (var i = 0; i < self._tabList.length; ++i) {
                    if (self._tabList[i].$tabBar[0] == this) {
                        self._draggingCustomTabFrame = self._tabList[i];

                        var $panelTab = $(event.target).hasClass('wcPanelTab') ? $(event.target) : $(event.target).parents('.wcPanelTab');
                        if ($panelTab && $panelTab.length) {
                            var index = parseInt($panelTab.attr('id'));
                            self._draggingCustomTabFrame.tab(index, true);
                            self._draggingFrameTab = $panelTab[0];
                        }
                        break;
                    }
                }
                if (self._draggingFrame) {
                    self.__focus(self._draggingFrame);
                }
                return true;
            }

            // on mousedown for .wcLayout
            function __onMouseDownLayout(event) {
                var mouse = self.__mouse(event);
                if (mouse.which === 3) {
                    return true;
                }
                for (var i = 0; i < self._frameList.length; ++i) {
                    if (self._frameList[i].panel() && self._frameList[i].panel().layout().scene()[0] == this) {
                        setTimeout(function () {
                            self.__focus(self._frameList[i]);
                        }, 10);
                        break;
                    }
                }
                return true;
            }

            // on mousedown for .wcFrameEdge
            function __onMouseDownResizeFrame(event) {
                var mouse = self.__mouse(event);
                if (mouse.which === 3) {
                    return true;
                }
                $('body').addClass('wcDisableSelection');
                for (var i = 0; i < self._frameList.length; ++i) {
                    if (self._frameList[i]._isFloating) {
                        if (self._frameList[i].$top[0] == this) {
                            self._draggingFrame = self._frameList[i];
                            self._draggingFrameSizer = ['top'];
                            break;
                        } else if (self._frameList[i].$bottom[0] == this) {
                            self._draggingFrame = self._frameList[i];
                            self._draggingFrameSizer = ['bottom'];
                            break;
                        } else if (self._frameList[i].$left[0] == this) {
                            self._draggingFrame = self._frameList[i];
                            self._draggingFrameSizer = ['left'];
                            break;
                        } else if (self._frameList[i].$right[0] == this) {
                            self._draggingFrame = self._frameList[i];
                            self._draggingFrameSizer = ['right'];
                            break;
                        } else if (self._frameList[i].$corner1[0] == this) {
                            self._draggingFrame = self._frameList[i];
                            self._draggingFrameSizer = ['top', 'left'];
                            break;
                        } else if (self._frameList[i].$corner2[0] == this) {
                            self._draggingFrame = self._frameList[i];
                            self._draggingFrameSizer = ['top', 'right'];
                            break;
                        } else if (self._frameList[i].$corner3[0] == this) {
                            self._draggingFrame = self._frameList[i];
                            self._draggingFrameSizer = ['bottom', 'right'];
                            break;
                        } else if (self._frameList[i].$corner4[0] == this) {
                            self._draggingFrame = self._frameList[i];
                            self._draggingFrameSizer = ['bottom', 'left'];
                            break;
                        }
                    }
                }
                if (self._draggingFrame) {
                    self.__focus(self._draggingFrame);
                }
                return true;
            }

            // on mousedown for .wcCreatePanel
            function __onMouseDownCreatePanel(event) {
                var mouse = self.__mouse(event);
                if (mouse.which !== 1) {
                    return true;
                }

                var panelType = $(this).data('panel');
                var info = self.panelTypeInfo(panelType);
                if (info) {
                    var rect = {
                        x: mouse.x - 250,
                        y: mouse.y,
                        w: 500,
                        h: 500
                    };
                    $('body').addClass('wcDisableSelection');
                    self._ghost = new (self.__getClass('wcGhost'))(rect, mouse, self);
                    self._ghost.update(mouse);
                    self._ghost.anchor(mouse, self._ghost.anchor());
                    self._creatingPanel = panelType;
                    self._creatingPanelNoFloating = !$(this).data('nofloating');
                    self.__focus();
                    self.trigger(wcDocker.EVENT.BEGIN_DOCK);
                }
            }

            // on mousedown for .wcPanelTab
            function __onMouseDownPanelTab(event) {
                var mouse = self.__mouse(event);
                if (mouse.which !== 2) {
                    return true;
                }

                var index = parseInt($(this).attr('id'));

                for (var i = 0; i < self._frameList.length; ++i) {
                    var frame = self._frameList[i];
                    if (frame.$tabBar[0] === $(this).parents('.wcFrameTitleBar')[0]) {
                        var panel = frame._panelList[index];
                        if (panel && panel.closeable()) {
                            self._removingPanel = frame._panelList[index];
                        }
                        return true;
                    }
                }
                return true;
            }

            // on keyup
            function __onKeyup(event) {
                if (event.keyCode == 27) {
                    if (self._ghost) {
                        self._ghost.destroy();
                        self._ghost = false;
                        self.trigger(wcDocker.EVENT.END_DOCK);

                        if (self._draggingFrame) {
                            self._draggingFrame.__shadow(false);
                        }
                        self._creatingPanel = false;
                        self._draggingSplitter = null;
                        self._draggingFrame = null;
                        self._draggingFrameSizer = null;
                        self._draggingFrameTab = null;
                        self._draggingFrameTopper = false;
                        self._draggingCustomTabFrame = null;
                        self._removingPanel = null;
                    }
                }
            }
        },

        // Test for load completion.
        __testLoadFinished: function () {
            for (var i = 0; i < this._frameList.length; ++i) {
                var frame = this._frameList[i];
                for (var a = 0; a < frame._panelList.length; ++a) {
                    var panel = frame._panelList[a];
                    // Skip if any panels are not initialized yet.
                    if (panel._isVisible && !panel._initialized) {
                        return;
                    }

                    // Skip if any panels still have a loading screen.
                    if (panel.$loading) {
                        return;
                    }
                }
            }

            // If we reach this point, all existing panels are initialized and loaded!
            var self = this;
            setTimeout(function() {
                self.trigger(wcDocker.EVENT.LOADED);

                // Now unregister all loaded events so they do not fire again.
                self.off(wcDocker.EVENT.LOADED);
                for (var i = 0; i < self._frameList.length; ++i) {
                    var frame = self._frameList[i];
                    for (var a = 0; a < frame._panelList.length; ++a) {
                        var panel = frame._panelList[a];
                        panel.off(wcDocker.EVENT.LOADED);
                    }
                }
            }, 0);
        },

        // Test for browser compatability issues.
        __compatibilityCheck: function () {
            // Provide backward compatibility for IE8 and other such older browsers.
            if (!Function.prototype.bind) {
                Function.prototype.bind = function (oThis) {
                    if (typeof this !== "function") {
                        // closest thing possible to the ECMAScript 5
                        // internal IsCallable function
                        throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
                    }

                    var aArgs = Array.prototype.slice.call(arguments, 1),
                        fToBind = this,
                        fNOP = function () {
                        },
                        fBound = function () {
                            return fToBind.apply(this instanceof fNOP && oThis
                                    ? this
                                    : oThis,
                                aArgs.concat(Array.prototype.slice.call(arguments)));
                        };

                    fNOP.prototype = this.prototype;
                    fBound.prototype = new fNOP();

                    return fBound;
                };
            }

            if (!Array.prototype.indexOf) {
                Array.prototype.indexOf = function (elt /*, from*/) {
                    var len = this.length >>> 0;

                    var from = Number(arguments[1]) || 0;
                    from = (from < 0)
                        ? Math.ceil(from)
                        : Math.floor(from);
                    if (from < 0)
                        from += len;

                    for (; from < len; from++) {
                        if (from in this &&
                            this[from] === elt)
                            return from;
                    }
                    return -1;
                };
            }

            // Check if the browser supports transformations. If not, we cannot rotate tabs or collapse panels.
            var ie = (function () {
                var v = 3;
                var div = document.createElement('div');
                var all = div.getElementsByTagName('i');
                while (
                    div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
                        all[0]
                    );
                return v > 4 ? v : undefined;
            }());

            if (ie < 9) {
                this._canOrientTabs = false;
            } else {
                function getSupportedTransform() {
                    var prefixes = 'transform WebkitTransform MozTransform OTransform msTransform'.split(' ');
                    var div = document.createElement('div');
                    for (var i = 0; i < prefixes.length; i++) {
                        if (div && div.style[prefixes[i]] !== undefined) {
                            return true;
                        }
                    }
                    return false;
                }

                this._canOrientTabs = getSupportedTransform();
            }

            // Check if we are running on a mobile device so we can alter themes accordingly.
            var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            $('body').addClass(isMobile ? "wcMobile" : "wcDesktop");
        },

        /*
         * Searches docked panels and splitters for a container that is within any static areas.
         */
        __findInner: function () {
            function isPaneStatic(pane) {
                return !!(pane && (pane.instanceOf('wcFrame') && pane.panel() && !pane.panel().moveable()) || (pane.instanceOf('wcCollapser')));
            }

            var parent = this._root;
            while (parent) {
                if (parent.instanceOf('wcSplitter')) {
                    var pane0 = isPaneStatic(parent._pane[0]);
                    var pane1 = isPaneStatic(parent._pane[1]);
                    if (pane0 && !pane1) {
                        parent = parent._pane[1];
                    } else if (pane1 && !pane0) {
                        parent = parent._pane[0];
                    } else if (!pane0 && !pane1) {
                        break;
                    }
                } else {
                    break;
                }
            }

            return parent;
        },

        /*
         * Sets up the collapsers for the panel.<br>
         * <b>Note: </b> This should be called AFTER you have initialized your panel layout, but BEFORE you add
         * any static panels that you do not wish to be overlapped by the collapsers (such as file menu panels).
         */
        __initCollapsers: function () {
            // Initialize collapsers if it is enabled and not already initialized.
            if (!this.isCollapseEnabled() || !$.isEmptyObject(this._collapser)) {
                return;
            }

            var parent = this.__findInner();

            function __createCollapser(location) {
                this._collapser[location] = this.__addCollapser(location, parent);
                parent = this._collapser[location]._parent;
                this._frameList.push(this._collapser[location]._drawer._frame);
            }

            __createCollapser.call(this, wcDocker.DOCK.LEFT);
            __createCollapser.call(this, wcDocker.DOCK.RIGHT);
            __createCollapser.call(this, wcDocker.DOCK.BOTTOM);

            var self = this;
            setTimeout(function () {
                self.__update();
            });
        },

        // Updates the sizing of all panels inside this window.
        __update: function (opt_dontMove) {
            this._dirty = true;
            this._dirtyDontMove = opt_dontMove;
        },

        // Forces an update, regardless of the response rate.
        __forceUpdate: function (opt_dontMove) {
            this._dirty = false;
            if (this._root) {
                this._root.__update(opt_dontMove);
            }

            for (var i = 0; i < this._floatingList.length; ++i) {
                this._floatingList[i].__update();
            }
        },

        __orderPanels: function () {
            if (this._floatingList.length === 0) {
                return;
            }

            var from = this._floatingList.indexOf(this._focusFrame);
            var to = this._floatingList.length - 1;

            this._floatingList.splice(to, 0, this._floatingList.splice(from, 1)[0]);

            var length = this._floatingList.length;
            var start = 10;
            var step = 5;
            var index = 0;
            var panel;

            for (var i = 0; i < this._floatingList.length; ++i) {
                panel = this._floatingList[i];
                if (panel) {
                    var layer = start + (i * step);
                    panel.$frame.css('z-index', layer);
                    panel.__trigger(wcDocker.EVENT.ORDER_CHANGED, layer);
                }
            }
        },

        // Retrieve mouse or touch position.
        __mouse: function (event) {
            if (event.originalEvent && (event.originalEvent.touches || event.originalEvent.changedTouches)) {
                var touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];
                return {
                    x: touch.clientX,
                    y: touch.clientY,
                    which: 1
                };
            }

            return {
                x: event.clientX || event.pageX,
                y: event.clientY || event.pageY,
                which: event.which || 1
            };
        },

        // On window resized event.
        __resize: function (event) {
            this._resizeData.time = new Date();
            if (!this._resizeData.timeout) {
                this._resizeData.timeout = true;
                setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
                this.__trigger(wcDocker.EVENT.RESIZE_STARTED);
            }
            this.__trigger(wcDocker.EVENT.RESIZED);
            this.__update(false);
        },

        // On window resize event ended.
        __resizeEnd: function () {
            if (new Date() - this._resizeData.time < this._resizeData.delta) {
                setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
            } else {
                this._resizeData.timeout = false;
                this.__trigger(wcDocker.EVENT.RESIZE_ENDED);
            }
        },

        // Brings a floating window to the top.
        // Params:
        //    frame     The frame to focus.
        //    flash     Whether to flash the frame.
        __focus: function (frame, flash) {
            var differentFrames = this._focusFrame != frame;
            if (this._focusFrame) {
                if (this._focusFrame._isFloating) {
                    this._focusFrame.$frame.removeClass('wcFloatingFocus');
                }

                var oldFocusFrame = this._focusFrame;
                this._focusFrame = null;

                oldFocusFrame.__trigger(wcDocker.EVENT.LOST_FOCUS);
                if (oldFocusFrame.isCollapser() && differentFrames) {
                    oldFocusFrame.collapse();
                    oldFocusFrame.panel(-1);
                }
            }

            this._focusFrame = frame;
            if (this._focusFrame) {
                if (this._focusFrame._isFloating) {
                    this._focusFrame.$frame.addClass('wcFloatingFocus');

                    if (differentFrames) {
                        $('body').append(this._focusFrame.$frame);
                    }
                }
                this._focusFrame.__focus(flash);

                this._focusFrame.__trigger(wcDocker.EVENT.GAIN_FOCUS);
            }

            this.__orderPanels();
        },

        // Triggers an event exclusively on the docker and none of its panels.
        // Params:
        //    eventName   The name of the event.
        //    data        A custom data parameter to pass to all handlers.
        __trigger: function (eventName, data) {
            if (!eventName) {
                return;
            }

            var results = [];

            if (this._events[eventName]) {
                var events = this._events[eventName].slice(0);
                for (var i = 0; i < events.length; ++i) {
                    results.push(events[i].call(this, data));
                }
            }

            return results;
        },

        // Checks a given panel to see if it is the final remaining
        // moveable panel in the docker.
        // Params:
        //    panel     The panel.
        // Returns:
        //    true      The panel is the last.
        //    false     The panel is not the last.
        __isLastPanel: function (panel) {
            for (var i = 0; i < this._frameList.length; ++i) {
                var testFrame = this._frameList[i];
                if (testFrame._isFloating || testFrame.isCollapser()) {
                    continue;
                }
                for (var a = 0; a < testFrame._panelList.length; ++a) {
                    var testPanel = testFrame._panelList[a];
                    if (testPanel !== panel && testPanel.moveable()) {
                        return false;
                    }
                }
            }

            return true;
        },

        // Checks a given frame to see if it is the final remaining
        // moveable frame in the docker.
        // Params:
        //    frame     The frame.
        // Returns:
        //    true      The panel is the last.
        //    false     The panel is not the last.
        __isLastFrame: function (frame) {
            for (var i = 0; i < this._frameList.length; ++i) {
                var testFrame = this._frameList[i];
                if (testFrame._isFloating || testFrame === frame || testFrame.isCollapser()) {
                    continue;
                }
                for (var a = 0; a < testFrame._panelList.length; ++a) {
                    var testPanel = testFrame._panelList[a];
                    if (testPanel.moveable()) {
                        return false;
                    }
                }
            }

            return true;
        },

        // For restore, creates the appropriate object type.
        __create: function (data, parent, $container) {
            switch (data.type) {
                case 'wcSplitter':
                    var splitter = new (this.__getClass('wcSplitter'))($container, parent, data.horizontal);
                    splitter.scrollable(0, false, false);
                    splitter.scrollable(1, false, false);
                    return splitter;

                case 'wcFrame':
                    var frame = new (this.__getClass('wcFrame'))($container, parent, data.floating);
                    this._frameList.push(frame);
                    if (data.floating) {
                        this._floatingList.push(frame);
                    }
                    return frame;

                case 'wcPanel':
                    if (data.panelType === wcDocker.PANEL_PLACEHOLDER) {
                        if (!this._placeholderPanel) {
                            this._placeholderPanel = new (this.__getClass('wcPanel'))(parent, wcDocker.PANEL_PLACEHOLDER, {});
                            this._placeholderPanel._isPlaceholder = true;
                            this._placeholderPanel.__container(this.$transition);
                            this._placeholderPanel._panelObject = new function (myPanel) {
                                myPanel.title(false);
                                myPanel.closeable(false);
                            }(this._placeholderPanel);
                            this._placeholderPanel.__container($container);
                        }
                        return this._placeholderPanel;
                    } else {
                        for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
                            if (this._dockPanelTypeList[i].name === data.panelType) {
                                var panel = new (this.__getClass('wcPanel'))(parent, data.panelType, this._dockPanelTypeList[i].options);
                                panel.__container(this.$transition);
                                var options = (this._dockPanelTypeList[i].options && this._dockPanelTypeList[i].options.options) || {};
                                panel._panelObject = new this._dockPanelTypeList[i].options.onCreate(panel, options);
                                panel.__container($container);
                                break;
                            }
                        }
                        return panel;
                    }
            }

            return null;
        },

        // Attempts to insert a given dock panel into an already existing frame.
        // If insertion is not possible for any reason, the panel will be
        // placed in its own frame instead.
        // Params:
        //    panel         The panel to insert.
        //    targetPanel   An optional panel to 'split', if not supplied the
        //                  new panel will split the center window.
        __addPanelGrouped: function (panel, targetPanel, options) {
            var frame = targetPanel;
            if (frame && frame.instanceOf('wcPanel')) {
                frame = targetPanel._parent;
            }

            if (frame && frame.instanceOf('wcFrame')) {
                if (options && options.tabOrientation) {
                    frame.tabOrientation(options.tabOrientation);
                }

                frame.addPanel(panel);
                return;
            }

            // If we did not manage to find a place for this panel, last resort is to put it in its own frame.
            this.__addPanelAlone(panel, wcDocker.DOCK.LEFT, targetPanel, options);
        },

        // Creates a new frame for the panel and then attaches it
        // to the window.
        // Params:
        //    panel         The panel to insert.
        //    location      The desired location for the panel.
        //    targetPanel   An optional panel to 'split', if not supplied the
        //                  new panel will split the center window.
        __addPanelAlone: function (panel, location, targetPanel, options) {
            if (targetPanel && targetPanel._shift) {
                var target = targetPanel;
                targetPanel = targetPanel._shift;
                target._shift = undefined;
            }

            if (options) {
                var width = this.$container.width();
                var height = this.$container.height();

                if (options.hasOwnProperty('x')) {
                    options.x = this.__stringToPixel(options.x, width);
                }
                if (options.hasOwnProperty('y')) {
                    options.y = this.__stringToPixel(options.y, height);
                }
                if (!options.hasOwnProperty('w')) {
                    options.w = panel.initSize().x;
                }
                if (!options.hasOwnProperty('h')) {
                    options.h = panel.initSize().y;
                }
                options.w = this.__stringToPixel(options.w, width);
                options.h = this.__stringToPixel(options.h, height);

                panel._size.x = options.w;
                panel._size.y = options.h;
            }

            // If we are collapsing the panel, put it into the collapser.
            if (targetPanel === wcDocker.COLLAPSED) {
                this.__initCollapsers();
                if (this._collapser[location]) {
                    targetPanel = this._collapser[location]._drawer._frame.addPanel(panel);
                    var self = this;
                    setTimeout(function () {
                        self.__update();
                    });
                    return panel;
                } else {
                    console.log('ERROR: Attempted to collapse panel "' + panel._type + '" to invalid location: ' + location);
                    return false;
                }
            }

            // Floating windows need no placement.
            if (location === wcDocker.DOCK.FLOAT || location === wcDocker.DOCK.MODAL) {
                var frame = new (this.__getClass('wcFrame'))(this.$container, this, true);
                if (options && options.tabOrientation) {
                    frame.tabOrientation(options.tabOrientation);
                }
                this._frameList.push(frame);
                this._floatingList.push(frame);
                this.__focus(frame);
                frame.addPanel(panel);
                frame.pos(panel._pos.x, panel._pos.y, false);

                if (location === wcDocker.DOCK.MODAL) {
                    frame.$modalBlocker = $('<div class="wcModalBlocker"></div>');
                    frame.$frame.prepend(frame.$modalBlocker);

                    panel.moveable(false);
                    frame.$frame.addClass('wcModal');
                    this._modalList.push(frame);
                }

                if (options) {
                    var pos = frame.pos(undefined, undefined, true);
                    if (options.hasOwnProperty('x')) {
                        pos.x = options.x + options.w / 2;
                    }
                    if (options.hasOwnProperty('y')) {
                        pos.y = options.y + options.h / 2;
                    }
                    frame.pos(pos.x, pos.y, true);
                    frame._size = {
                        x: options.w,
                        y: options.h
                    };
                }

                this.__orderPanels();
                return;
            }

            if (targetPanel) {
                var parentSplitter = targetPanel._parent;

                var splitterChild = targetPanel;

                while (parentSplitter && !(parentSplitter.instanceOf('wcSplitter') || parentSplitter.instanceOf('wcDocker'))) {
                    splitterChild = parentSplitter;
                    parentSplitter = parentSplitter._parent;
                }

                if (parentSplitter && parentSplitter.instanceOf('wcSplitter')) {
                    var splitter;
                    var left = parentSplitter.pane(0);
                    var right = parentSplitter.pane(1);
                    var size = {
                        x: -1,
                        y: -1
                    };
                    if (left === splitterChild) {
                        splitter = new (this.__getClass('wcSplitter'))(this.$transition, parentSplitter, location !== wcDocker.DOCK.BOTTOM && location !== wcDocker.DOCK.TOP);
                        size.x = parentSplitter.$pane[0].width();
                        size.y = parentSplitter.$pane[0].height();
                        parentSplitter.pane(0, splitter);
                    } else {
                        splitter = new (this.__getClass('wcSplitter'))(this.$transition, parentSplitter, location !== wcDocker.DOCK.BOTTOM && location !== wcDocker.DOCK.TOP);
                        size.x = parentSplitter.$pane[1].width();
                        size.y = parentSplitter.$pane[1].height();
                        parentSplitter.pane(1, splitter);
                    }

                    if (splitter) {
                        splitter.scrollable(0, false, false);
                        splitter.scrollable(1, false, false);

                        if (!options) {
                            options = {
                                w: panel._size.x,
                                h: panel._size.y
                            };
                        }

                        if (options) {
                            if (options.w < 0) {
                                options.w = size.x / 2;
                            }
                            if (options.h < 0) {
                                options.h = size.y / 2;
                            }

                            switch (location) {
                                case wcDocker.DOCK.LEFT:
                                    splitter.pos(options.w / size.x);
                                    break;
                                case wcDocker.DOCK.RIGHT:
                                    splitter.pos(1.0 - (options.w / size.x));
                                    break;
                                case wcDocker.DOCK.TOP:
                                    splitter.pos(options.h / size.y);
                                    break;
                                case wcDocker.DOCK.BOTTOM:
                                    splitter.pos(1.0 - (options.h / size.y));
                                    break;
                            }
                        } else {
                            splitter.pos(0.5);
                        }

                        frame = new (this.__getClass('wcFrame'))(this.$transition, splitter, false);
                        this._frameList.push(frame);
                        if (location === wcDocker.DOCK.LEFT || location === wcDocker.DOCK.TOP) {
                            splitter.pane(0, frame);
                            splitter.pane(1, splitterChild);
                        } else {
                            splitter.pane(0, splitterChild);
                            splitter.pane(1, frame);
                        }

                        frame.addPanel(panel);
                    }
                    return;
                }
            }

            var parent = this;
            var $container = this.$container;
            var frame = new (this.__getClass('wcFrame'))(this.$transition, parent, false);
            this._frameList.push(frame);

            if (!parent._root) {
                parent._root = frame;
                frame.__container($container);
            } else {
                var splitter = new (this.__getClass('wcSplitter'))($container, parent, location !== wcDocker.DOCK.BOTTOM && location !== wcDocker.DOCK.TOP);
                if (splitter) {
                    frame._parent = splitter;
                    splitter.scrollable(0, false, false);
                    splitter.scrollable(1, false, false);
                    var size = {
                        x: $container.width(),
                        y: $container.height()
                    };

                    if (!options) {
                        splitter.__findBestPos();
                    } else {
                        if (options.w < 0) {
                            options.w = size.x / 2;
                        }
                        if (options.h < 0) {
                            options.h = size.y / 2;
                        }

                        switch (location) {
                            case wcDocker.DOCK.LEFT:
                                splitter.pos(options.w / size.x);
                                break;
                            case wcDocker.DOCK.RIGHT:
                                splitter.pos(1.0 - (options.w / size.x));
                                break;
                            case wcDocker.DOCK.TOP:
                                splitter.pos(options.h / size.y);
                                break;
                            case wcDocker.DOCK.BOTTOM:
                                splitter.pos(1.0 - (options.h / size.y));
                                break;
                        }
                    }

                    if (location === wcDocker.DOCK.LEFT || location === wcDocker.DOCK.TOP) {
                        splitter.pane(0, frame);
                        splitter.pane(1, parent._root);
                    } else {
                        splitter.pane(0, parent._root);
                        splitter.pane(1, frame);
                    }

                    parent._root = splitter;
                }
            }

            frame.addPanel(panel);
        },

        __addCollapser: function (location, parent) {
            var collapser = null;
            if (parent) {
                var parentSplitter = parent._parent;
                var splitterChild = parent;
                var _d = dcl;

                while (parentSplitter && !(parentSplitter.instanceOf('wcSplitter') || parentSplitter.instanceOf('wcDocker'))){
                    splitterChild = parentSplitter;
                    parentSplitter = parentSplitter._parent;
                }

                var splitter = new (this.__getClass('wcSplitter'))(this.$transition, parentSplitter, location !== wcDocker.DOCK.BOTTOM && location !== wcDocker.DOCK.TOP);

                if (parentSplitter && parentSplitter.instanceOf('wcDocker')){
                    this._root = splitter;
                    splitter.__container(this.$container);
                }

                if (parentSplitter && parentSplitter.instanceOf('wcSplitter')) {
                    var left = parentSplitter.left();
                    var right = parentSplitter.right();
                    var size = {
                        x: -1,
                        y: -1
                    };
                    if (left === splitterChild) {
                        size.x = parentSplitter.$pane[0].width();
                        size.y = parentSplitter.$pane[0].height();
                        parentSplitter.pane(0, splitter);
                    } else {
                        splitter = new (this.__getClass('wcSplitter'))(this.$transition, parentSplitter, location !== wcDocker.DOCK.BOTTOM && location !== wcDocker.DOCK.TOP);
                        size.x = parentSplitter.$pane[1].width();
                        size.y = parentSplitter.$pane[1].height();
                        parentSplitter.pane(1, splitter);
                    }
                }


                if (splitter) {
                    splitter.scrollable(0, false, false);
                    splitter.scrollable(1, false, false);
                    collapser = new (this.__getClass('wcCollapser'))(this.$transition, splitter, location);
                    switch (location) {
                        case wcDocker.DOCK.TOP:
                        case wcDocker.DOCK.LEFT:
                            splitter.pos(0);
                            break;
                        case wcDocker.DOCK.BOTTOM:
                        case wcDocker.DOCK.RIGHT:
                            splitter.pos(1);
                            break;
                    }

                    if (location === wcDocker.DOCK.LEFT || location === wcDocker.DOCK.TOP) {
                        splitter.pane(0, collapser);
                        splitter.pane(1, splitterChild);
                    } else {
                        splitter.pane(0, splitterChild);
                        splitter.pane(1, collapser);
                    }
                }
            }
            return collapser;
        },

        // Adds the placeholder panel as needed
        __addPlaceholder: function (targetPanel) {
            if (this._placeholderPanel) {
                console.log('WARNING: wcDocker creating placeholder panel when one already exists');
            }

            this._placeholderPanel = new (this.__getClass('wcPanel'))(this, wcDocker.PANEL_PLACEHOLDER, {});
            this._placeholderPanel._isPlaceholder = true;
            this._placeholderPanel.__container(this.$transition);
            this._placeholderPanel._panelObject = new function (myPanel) {
                myPanel.title(false);
                myPanel.closeable(false);
            }(this._placeholderPanel);

            if (targetPanel) {
                this.__addPanelGrouped(this._placeholderPanel, targetPanel);
            } else {
                this.__addPanelAlone(this._placeholderPanel, wcDocker.DOCK.TOP);
            }

            this.__update();
        },

        __closePanel: function(panel) {
            // If the panel is persistent, instead of destroying it, add it to a persistent list instead.
            var dontDestroy = false;
            var panelOptions = this.panelTypeInfo(panel._type);
            if (panelOptions && panelOptions.isPersistent) {
                dontDestroy = true;
                this._persistentList.push(panel);
            }
            this.removePanel(panel, dontDestroy);
            this.__update();
        },

        // Converts a potential string value to a percentage.
        __stringToPercent: function (value, size) {
            if (typeof value === 'string') {
                if (value.indexOf('%', value.length - 1) !== -1) {
                    return parseFloat(value) / 100;
                } else if (value.indexOf('px', value.length - 2) !== -1) {
                    return parseFloat(value) / size;
                }
            }
            return parseFloat(value);
        },

        // Converts a potential string value to a pixel value.
        __stringToPixel: function (value, size) {
            if (typeof value === 'string') {
                if (value.indexOf('%', value.length - 1) !== -1) {
                    return (parseFloat(value) / 100) * size;
                } else if (value.indexOf('px', value.length - 2) !== -1) {
                    return parseFloat(value);
                }
            }
            return parseFloat(value);
        }
    });

    //merge types into module
    for(var prop in wcDocker){
        Module[prop] = wcDocker[prop];
    }

    //track and expose default classes
    Module.defaultClasses = defaultClasses;

    return Module;
});