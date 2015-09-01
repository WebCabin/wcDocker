define([
    "dcl/dcl"
], function (dcl) {

    return dcl(null,{
        /**
         * Retrieves the main [docker]{@link wcDocker} instance.
         *
         * @returns {wcDocker} - The top level docker object.
         */
        docker: function () {
            var parent = this._parent;
            while (parent && !(parent instanceof wcDocker)) {
                parent = parent._parent;
            }
            return parent;
        }
    })
});
