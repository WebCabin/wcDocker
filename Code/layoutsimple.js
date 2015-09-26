/** @module wcLayoutSimple */
define([
    "dcl/dcl",
    "./types",
    "./layout"
], function (dcl, wcDocker, wcLayout) {

    /**
     * @class
     * A simple layout for containing elements in a panel. [Panels]{@link wcPanel}, [splitter widgets]{@link wcSplitter}
     * and [tab widgets]{@link wcTabFrame} can optionally contain these instead of the default {@link wcLayoutTable}.
     */
    var Module = dcl(wcLayout, {
        declaredClass: 'wcLayoutSimple',

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
    });

    // window['wcLayoutSimple'] = Module;

    return Module;
});

