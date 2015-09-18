/** @module wcBase */
define([
    "dcl/dcl"
], function (dcl) {
    /**
     * Base class for all docker classes
     * @class module:wcBase
     */
    return dcl(null,{
        /**
         * Returns this or the docker's options
         * @TODO: better looking through the parents?
         * @returns {Object|null}
         */
        getOptions:function(){
            return this._options || this.docker()._options || {};
        },
        /**
         * Return an option found in this or in the docker.
         * @param name
         * @param _default {Object|null}
         * @returns {Object|null}
         */
        option:function(name,_default){
            return this.getOptions()[name] || _default;
        },
        _getClass:function(name){
            return this.getOptions()['classNames'][name];
        },
        /**
         * Class eq function
         * @param {string} what
         * @param {object} [who]
         * @returns {boolean}
         */
        instanceOf: function(what, who){
            who = who || this;
            return !!(who && (who.declaredClass.indexOf(what)!=-1));
        },

        /**
         * Retrieves the main [docker]{@link module:wcDocker} instance.
         *
         * @returns {module:wcDocker} - The top level docker object.
         */
        docker: function(startNode) {
            var parent = startNode || this._parent;
            while (parent && !(parent.instanceOf('wcDocker'))) {
                parent = parent._parent;
            }
            return parent;
        }
    })
});
