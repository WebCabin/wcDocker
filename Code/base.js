define([
    "dcl/dcl"
], function (dcl) {

    return dcl(null,{

        /**
         * Dcl
         * @param who
         * @param what
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
