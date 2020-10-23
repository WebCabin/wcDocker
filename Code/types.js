define([], function () {

    //stub
    var wcDocker = {};

    /**
     * Enumerated Docking positions.
     * @member module:wcDocker.DOCK
     * @property {String} MODAL="modal" - A floating panel that blocks input until closed
     * @property {String} FLOAT="float" - A floating panel
     * @property {String} TOP="top" - Docks to the top of a target or window
     * @property {String} LEFT="left" - Docks to the left of a target or window
     * @property {String} RIGHT="right" - Docks to the right of a target or window
     * @property {String} BOTTOM="bottom" - Docks to the bottom of a target or window
     * @property {String} STACKED="stacked" - Docks as another tabbed item along with the target
     * @version 3.0.0
     * @const
     */
    wcDocker.DOCK = {
        MODAL: 'modal',
        FLOAT: 'float',
        TOP: 'top',
        LEFT: 'left',
        RIGHT: 'right',
        BOTTOM: 'bottom',
        STACKED: 'stacked'
    };

    /**
     * Enumerated Layout wcDocker.
     * @member module:wcDocker.LAYOUT
     * @property {String} SIMPLE="wcLayoutSimple" - Contains a single div item without management using a {@link module:wcLayoutSimple}, it is up to you to populate it however you wish.
     * @property {String} TABLE="wcLayoutTable" - Manages a table grid layout using {@link module:wcLayoutTable}, this is the default layout used if none is specified.
     * @version 3.0.0
     * @const
     */
    wcDocker.LAYOUT = {
        SIMPLE: 'wcLayoutSimple',
        TABLE: 'wcLayoutTable'
    };

    /**
     * Enumerated Internal events
     * @member module:wcDocker.EVENT
     * @property {String} INIT="panelInit" - When the panel is initialized
     * @property {String} LOADED="dockerLoaded" - When all panels have finished loading
     * @property {String} UPDATED="panelUpdated" - When the panel is updated
     * @property {String} VISIBILITY_CHANGED="panelVisibilityChanged" - When the panel has changed its visibility<br>This event is called with the current visibility state as the first parameter
     * @property {String} BEGIN_DOCK="panelBeginDock" - When the user begins moving any panel from its current docked position
     * @property {String} END_DOCK="panelEndDock" - When the user finishes moving or docking a panel
     * @property {String} GAIN_FOCUS="panelGainFocus" - When the user brings any panel within a tabbed frame into focus
     * @property {String} LOST_FOCUS="panelLostFocus" - When the user leaves focus on any panel within a tabbed frame
     * @property {String} OPENED="panelOpened" - When the panel is opened
     * @property {String} CLOSING="panelClosing" - When the panel is about to be closed, but before it closes. If any event handler returns a falsey value, the close action will be canceled.
     * @property {String} CLOSED="panelClosed" - When the panel is being closed
     * @property {String} PERSISTENT_CLOSED="panelPersistentClosed" - When a persistent panel is being hidden
     * @property {String} PERSISTENT_OPENED="panelPersistentOpened" - When a persistent panel is being shown
     * @property {String} BUTTON="panelButton" - When a custom button is clicked, See [wcPanel.addButton]{@link module:wcPanel~addButton}
     * @property {String} ATTACHED="panelAttached" - When the panel has moved from floating to a docked position
     * @property {String} DETACHED="panelDetached" - When the panel has moved from a docked position to floating
     * @property {String} MOVE_STARTED="panelMoveStarted" - When the user has started moving the panel (top-left coordinates changed)<br>This event is called with an object of the current {x, y} position as the first parameter
     * @property {String} MOVE_ENDED="panelMoveEnded" - When the user has finished moving the panel<br>This event is called with an object of the current {x, y} position as the first parameter
     * @property {String} MOVED="panelMoved" - When the top-left coordinates of the panel has changed<br>This event is called with an object of the current {x, y} position as the first parameter
     * @property {String} RESIZE_STARTED="panelResizeStarted" - When the user has started resizing the panel (width or height changed)<br>This event is called with an object of the current {width, height} size as the first parameter
     * @property {String} RESIZE_ENDED="panelResizeEnded" - When the user has finished resizing the panel<br>This event is called with an object of the current {width, height} size as the first parameter
     * @property {String} RESIZED="panelResized" - When the panels width or height has changed<br>This event is called with an object of the current {width, height} size as the first parameter
     * @property {String} ORDER_CHANGED="panelOrderChanged" - This only happens with floating windows when the order of the windows have changed.
     * @property {String} SCROLLED="panelScrolled" - When the contents of the panel has been scrolled
     * @property {String} SAVE_LAYOUT="layoutSave" - When the layout is being saved, See [wcDocker.save]{@link module:wcDocker#save}
     * @property {String} RESTORE_LAYOUT="layoutRestore" - When the layout is being restored, See [wcDocker.restore]{@link module:wcDocker#restore}
     * @property {String} CUSTOM_TAB_CHANGED="customTabChanged" - When the current tab on a custom tab widget associated with this panel has changed, See {@link module:wcTabFrame}
     * @property {String} CUSTOM_TAB_CLOSED="customTabClosed" - When a tab has been closed on a custom tab widget associated with this panel, See {@link module:wcTabFrame}
     * @property {String} LAYOUT_CHANGED="layoutCanged" - When layout of a panel is resized, moved or any structural changes.
     * @version 3.0.0
     * @const
     */
    wcDocker.EVENT = {
        INIT: 'panelInit',
        LOADED: 'dockerLoaded',
        UPDATED: 'panelUpdated',
        VISIBILITY_CHANGED: 'panelVisibilityChanged',
        BEGIN_DOCK: 'panelBeginDock',
        END_DOCK: 'panelEndDock',
        GAIN_FOCUS: 'panelGainFocus',
        LOST_FOCUS: 'panelLostFocus',
        OPENED: 'panelOpened',
        CLOSING: 'panelClosing',
        CLOSED: 'panelClosed',
        PERSISTENT_CLOSED: 'panelPersistentClosed',
        PERSISTENT_OPENED: 'panelPersistentOpened',
        BUTTON: 'panelButton',
        ATTACHED: 'panelAttached',
        DETACHED: 'panelDetached',
        MOVE_STARTED: 'panelMoveStarted',
        MOVE_ENDED: 'panelMoveEnded',
        MOVED: 'panelMoved',
        RESIZE_STARTED: 'panelResizeStarted',
        RESIZE_ENDED: 'panelResizeEnded',
        RESIZED: 'panelResized',
        ORDER_CHANGED: 'panelOrderChanged',
        SCROLLED: 'panelScrolled',
        SAVE_LAYOUT: 'layoutSave',
        RESTORE_LAYOUT: 'layoutRestore',
        CUSTOM_TAB_CHANGED: 'customTabChanged',
        CUSTOM_TAB_CLOSED: 'customTabClosed',
        LAYOUT_CHANGED: 'layoutCanged',
        RENAME: 'panelRename'
    };

    /**
     * The events which says layout has changed
     * @private
     * @memberOf module:wcDocker
     * @constant {Array} module:wcDocker.LAYOUT_CHANGE_EVENTS
     */

    wcDocker.LAYOUT_CHANGE_EVENTS = [
        wcDocker.EVENT.VISIBILITY_CHANGED,
        wcDocker.EVENT.END_DOCK,
        wcDocker.EVENT.OPENED,
        wcDocker.EVENT.CLOSED,
        wcDocker.EVENT.PERSISTENT_OPENED,
        wcDocker.EVENT.PERSISTENT_CLOSED,
        wcDocker.EVENT.ATTACHED,
        wcDocker.EVENT.DETACHED,
        wcDocker.EVENT.MOVE_ENDED,
        wcDocker.EVENT.RESIZE_ENDED,
        wcDocker.ORDER_CHANGED
    ];

    /**
     * The levels of locking the layout. Based on these levels the docking, undocking and resizing of panels will be allowed or prevented. Note that, moving a floating panel will never be locked
     * @member module:wcDocker.LOCK_LAYOUT_LEVEL
     * @property {String} NONE='None' - No locking, allow all events
     * @property {String} PREVENT_DOCKING='PreventDocking' - Prevent docking/undocking of panels. Resizing on panels will work.
     * @property {String} FULL='Full' - Full lock, prevents docking, undocking and resizing of panels.
     * @version 3.0.0
     * @const
     */

    wcDocker.LOCK_LAYOUT_LEVEL = {
        NONE: 'None',
        PREVENT_DOCKING: 'PreventDocking',
        FULL: 'Full'
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
     * @member module:wcDocker.ORIENTATION
     * @property {Boolean} VERTICAL=false - Top and Bottom panes
     * @property {Boolean} HORIZONTAL=true - Left and Right panes
     * @version 3.0.0
     * @const
     */
    wcDocker.ORIENTATION = {
        VERTICAL: false,
        HORIZONTAL: true
    };
    /**
     * Used to determine the position of tabbed widgets for stacked panels.<br>
     * <b>Note:</b> Not supported on IE8 or below.
     * @member module:wcDocker.TAB
     * @property {String} TOP="top" - The default, puts tabs at the top of the frame
     * @property {String} LEFT="left" - Puts tabs on the left side of the frame
     * @property {String} RIGHT="right" - Puts tabs on the right side of the frame
     * @property {String} BOTTOM="bottom" - Puts tabs on the bottom of the frame
     * @version 3.0.0
     * @const
     */
    wcDocker.TAB = {
        TOP: 'top',
        LEFT: 'left',
        RIGHT: 'right',
        BOTTOM: 'bottom'
    };

    return wcDocker;

});