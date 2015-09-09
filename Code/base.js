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
         * Class eq function
         * @param who {object}
         * @param what {string}
         * @returns {boolean}
         */
        instanceOf:function(who,what){
            who = who || this;
            return !!(who && (who.declaredClass.indexOf(what)!=-1));
        },
        /**
         * Retrieves the main [docker]{@link module:wcDocker} instance.
         *
         * @returns {module:wcDocker} - The top level docker object.
         */
        docker: function (startNode) {
            var parent = startNode  || this._parent;
            while (parent && !(parent.instanceOf(null,'wcDocker'))) {
                parent = parent._parent;
            }
            return parent;
        }
    })
});
