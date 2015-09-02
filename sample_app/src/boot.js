define([
    'delite/register',
    "deliteful/Button",
    "xdelite/theme"
], function (register) {
    register.parse();
    return {
        log: function(){
            console.log("test");
        }
    };
});
