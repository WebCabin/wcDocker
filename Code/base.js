/** @module wcBase */
define([
    "dcl/dcl"
], function(dcl) {
    /**
     * Base class for all docker classes
     * @class module:wcBase
     */
    return dcl(null, {
        /**
         * Returns this or the docker's options
         * @TODO: better looking through the parents?
         * @function module:wcBase#getOptions
         * @returns {Object|null}
         */
        getOptions: function() {
            return this._options || this.docker()._options || {};
        },

        /**
         * Return an option found in this or in the docker.
         * @function module:wcBase#option
         * @param name
         * @param _default {Object|null}
         * @returns {Object|null}
         */
        option: function(name,_default) {
            return this.getOptions()[name] || _default;
        },

        /**
         * Class eq function
         * @function module:wcBase#instanceOf
         * @param {string} what
         * @param {object} [who]
         * @returns {boolean}
         */
        instanceOf: function(what, who) {
            who = who || this;
            return !!(who && (who.declaredClass.indexOf(what)!=-1));
        },

        /**
         * Retrieves the main [docker]{@link module:wcDocker} instance.
         * @function module:wcBase#docker
         * @returns {module:wcDocker} - The top level docker object.
         */
        docker: function(startNode) {
            var parent = startNode || this._parent;
            while (parent && !(parent.instanceOf('wcDocker'))) {
                parent = parent._parent;
            }
            return parent;
        },

        /**
         * Return a module (dcl) by class name.
         * @function module:wcBase#__getClass
         * @param name {string} the class name, for instance "wcPanel", "wcSplitter" and so forth. Please see in wcDocker#defaultClasses for available class names.
         * @returns {object} the dcl module found in options
         * @private
         */
        __getClass: function(name) {
            return this.getOptions()[name+'Class'];
        }
    });
});
