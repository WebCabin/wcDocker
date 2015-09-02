module.exports = function(grunt) {
    //grunt.loadNpmTasks('grunt-closure-compiler');

    grunt.initConfig({

        // !! This is the name of the task ('requirejs')
        requirejs: {
            compile: {

                // !! You can drop your app.build.js config wholesale into 'options'
                options: {
                    appDir: "src/",
                    baseUrl: ".",
                    dir:'build',
                    optimize: 'uglify2',
                    mainConfigFile:'./src/main.js',
                    optimizeCss:'none',
                    modules:[
                        {
                            name:'boot'
                        }
                    ],
                    logLevel: 0,
                    findNestedDependencies: true,
                    fileExclusionRegExp: /^\./,
                    inlineText: true
                }
            }
        }

    });

    // !! This loads the plugin into grunt
    grunt.loadNpmTasks('grunt-contrib-requirejs');

};