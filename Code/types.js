define([], function () {

    //stub
    var wcDocker = {};

    /**
     * Enumerated Docking positions.
     * @version 3.0.0
     * @memberOf module:wcDocker
     * @enum {String} module:wcDocker.DOCK
     */
    wcDocker.DOCK = {
        /** A floating panel that blocks input until closed */
        MODAL: 'modal',
        /** A floating panel */
        FLOAT: 'float',
        /** Docks to the top of a target or window */
        TOP: 'top',
        /** Docks to the left of a target or window */
        LEFT: 'left',
        /** Docks to the right of a target or window */
        RIGHT: 'right',
        /** Docks to the bottom of a target or window */
        BOTTOM: 'bottom',
        /** Docks as another tabbed item along with the target */
        STACKED: 'stacked'
    };

    /**
     * Enumerated Layout wcDocker.
     * @memberOf module:wcDocker
     * @version 3.0.0
     * @enum {String} module:wcDocker.LAYOUT
     */
    wcDocker.LAYOUT = {
        /** Contains a single div item without management using a {@link module:wcLayoutSimple}, it is up to you to populate it however you wish. */
        SIMPLE: 'wcLayoutSimple',
        /** Manages a table grid layout using {@link module:wcLayoutTable}, this is the default layout used if none is specified. **/
        TABLE: 'wcLayoutTable'
    };

    /**
     * Enumerated Internal events
     * @version 3.0.0
     * @memberOf module:wcDocker
     * @enum {String} module:wcDocker.EVENT
     */
    wcDocker.EVENT = {
        /** When the panel is initialized */
        INIT: 'panelInit',
        /** When all panels have finished loading */
        LOADED: 'dockerLoaded',
        /** When the panel is updated */
        UPDATED: 'panelUpdated',
        /**
         * When the panel has changed its visibility<br>
         * This event is called with the current visibility state as the first parameter.
         */
        VISIBILITY_CHANGED: 'panelVisibilityChanged',
        /** When the user begins moving any panel from its current docked position */
        BEGIN_DOCK: 'panelBeginDock',
        /** When the user finishes moving or docking a panel */
        END_DOCK: 'panelEndDock',
        /** When the user brings any panel within a tabbed frame into focus */
        GAIN_FOCUS: 'panelGainFocus',
        /** When the user leaves focus on any panel within a tabbed frame */
        LOST_FOCUS: 'panelLostFocus',
        /** When the panel is being closed */
        CLOSED: 'panelClosed',
        /** When a persistent panel is being hidden */
        PERSISTENT_CLOSED: 'panelPersistentClosed',
        /** When a persistent panel is being shown */
        PERSISTENT_OPENED: 'panelPersistentOpened',
        /** When a custom button is clicked, See [wcPanel.addButton]{@link module:wcPanel~addButton} */
        BUTTON: 'panelButton',
        /** When the panel has moved from floating to a docked position */
        ATTACHED: 'panelAttached',
        /** When the panel has moved from a docked position to floating */
        DETACHED: 'panelDetached',
        /**
         * When the user has started moving the panel (top-left coordinates changed)<br>
         * This event is called with an object of the current {x, y} position as the first parameter.
         */
        MOVE_STARTED: 'panelMoveStarted',
        /**
         * When the user has finished moving the panel<br>
         * This event is called with an object of the current {x, y} position as the first parameter.
         */
        MOVE_ENDED: 'panelMoveEnded',
        /**
         * When the top-left coordinates of the panel has changed<br>
         * This event is called with an object of the current {x, y} position as the first parameter.
         */
        MOVED: 'panelMoved',
        /**
         * When the user has started resizing the panel (width or height changed)<br>
         * This event is called with an object of the current {width, height} size as the first parameter.
         */
        RESIZE_STARTED: 'panelResizeStarted',
        /**
         * When the user has finished resizing the panel<br>
         * This event is called with an object of the current {width, height} size as the first parameter.
         */
        RESIZE_ENDED: 'panelResizeEnded',
        /**
         * When the panels width or height has changed<br>
         * This event is called with an object of the current {width, height} size as the first parameter.
         */
        RESIZED: 'panelResized',
        /** This only happens with floating windows when the order of the windows have changed. */
        ORDER_CHANGED: 'panelOrderChanged',
        /** When the contents of the panel has been scrolled */
        SCROLLED: 'panelScrolled',
        /** When the layout is being saved, See [wcDocker.save]{@link module:wcDocker#save} */
        SAVE_LAYOUT: 'layoutSave',
        /** When the layout is being restored, See [wcDocker.restore]{@link module:wcDocker#restore} */
        RESTORE_LAYOUT: 'layoutRestore',
        /** When the current tab on a custom tab widget associated with this panel has changed, See {@link module:wcTabFrame} */
        CUSTOM_TAB_CHANGED: 'customTabChanged',
        /** When a tab has been closed on a custom tab widget associated with this panel, See {@link module:wcTabFrame} */
        CUSTOM_TAB_CLOSED: 'customTabClosed'
    };

    /**
     * The name of the placeholder panel.
     * @private
     * @memberOf module:wcDocker
     * @constant {String} module:wcDocker.PANEL_PLACEHOLDER
     */
    wcDocker.PANEL_PLACEHOLDER = '__wcDockerPlaceholderPanel';

    /**
     * Used when [adding]{@link module:wcDocker#addPanel} or [moving]{@link module:wcDocker#movePanel} a panel to designate the target location as collapsed.<br>
     * Must be used with [docking]{@link module:wcDocker.DOCK} positions LEFT, RIGHT, or BOTTOM only.
     * @memberOf module:wcDocker
     * @constant {String} module:wcDocker.COLLAPSED
     */
    wcDocker.COLLAPSED = '__wcDockerCollapsedPanel';

    /**
     * Used for the splitter bar orientation.
     * @version 3.0.0
     * @memberOf module:wcDocker
     * @enum {Boolean} module:wcDocker.ORIENTATION
     */
    wcDocker.ORIENTATION = {
        /** Top and Bottom panes */
        VERTICAL: false,
        /** Left and Right panes */
        HORIZONTAL: true
    };
    /**
     * Used to determine the position of tabbed widgets for stacked panels.<br>
     * <b>Note:</b> Not supported on IE8 or below.
     * @version 3.0.0
     * @enum {String} module:wcDocker.TAB
     * @memberOf module:wcDocker
     */
    wcDocker.TAB = {
        /** The default, puts tabs at the top of the frame */
        TOP: 'top',
        /** Puts tabs on the left side of the frame */
        LEFT: 'left',
        /** Puts tabs on the right side of the frame */
        RIGHT: 'right',
        /** Puts tabs on the bottom of the frame */
        BOTTOM: 'bottom'
    };

    return wcDocker;

});