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
         * @param who {object}
         * @param what {string}
         * @returns {boolean}
         */
        instanceOf:function(who,what){

            who = who || this;

            if(who && (who.declaredClass === what)){
                return true;
            }
            return false;
        },
        /**
         * Retrieves the main [docker]{@link wcDocker} instance.
         *
         * @returns {wcDocker} - The top level docker object.
         */
        docker: function () {
            var parent = this._parent;
            while (parent && !(parent.instanceOf(null,'wcDocker'))) {
                parent = parent._parent;
            }
            return parent;
        }
    })
});
