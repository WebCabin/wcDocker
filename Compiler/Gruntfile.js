/*global module */
module.exports = function (grunt) {


    function log(err, stdout, stderr, cb) {
        console.log(arguments);
        cb();
    }

    var outprop = "amdoutput";
    var outdir = "../build/";
    var tmpdir = "../tmp/";

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        copy: {
            plugins: {
                expand: true,
                cwd: tmpdir,
                src: "<%= " + outprop + ".plugins.rel %>",
                dest: outdir
            },
            themes:{
                src: "../Themes/*.*",
                dest: "../Build/"
            },
            style:{
                src: "../Code/style.css",
                dest: "../Build/wcDocker.css"
            },
            /**
             * The build tasks requires almond.js in Compiler/libs.
             * Since its installed by "bower install" in the root
             * directory, it needs to be copied over
             */
            almond:{
                src: "../bower_components/almond/almond.js",
                dest: "libs/almond.js"
            }

        },
        //not needed anymore
        jshint: {
            src: [
                "**/*.js",
                "!./app.profile.js",
                "!{node_modules}/**/*.js"
            ],
            options: {
                jshintrc: ".jshintrc"
            }
        },

        //needed later
        intern: {
            local: {
                options: {
                    runType: 'runner',
                    config: 'test/intern/intern.local'
                }
            },
            remote: {
                options: {
                    runType: 'runner',
                    config: 'test/intern/intern'
                }
            }
        },

        jsdoc : {

            dist : {
                src: [
                    'Code/*.js',
                    'Code/*.jsdoc',
                    'README.md'
                ],
                options: {
                    destination: 'Build/Docs',
                    template : "node_modules/ink-docstrap/template",
                    configure : "Compiler/config_documents.json",
                    "templates": {
                        "cleverLinks": false,
                        "monospaceLinks": false,
                        "systemTitle": "wcDocker",
                        "systemName": "<div style='font-size:15px;line-height:15px;margin-top:-5px;'>Web Cabin Docker<br>v3.0.0 (pre-release)</div>",
                        "footer": "",
                        "copyright": "",
                        "navType": "vertical",
                        "theme": "superhero",
                        "linenums": true,
                        "collapseSymbols": false,
                        "inverseNav": true,
                        "outputSourceFiles": true,
                        "outputSourcePath": false,
                        "dateFormat": "YYYY-MM-DD",
                        "highlightTutorialCode": false,
                        "syntaxTheme": "dark",
                        "analytics": {
                            "piwikSite": 6,
                            "domain": "analytics.webcabin.org"
                        }
                    }
                }
            }
        },

        requirejs: {
            /**
             * Not needed, but added for completeness:
             * Grunt task to compile entire demo app. Its not
             * using ./demo.js but the AMD version of it:
             * Code/samples/demoAMD.js
             */
            compileDemo: {

                options: {
                    baseUrl: '.',

                    out: '../Build/demo.js',
                    optimize: 'none',
                    name: 'libs/almond',
                    //require-js bootstrap
                    include: ['demo'],
                    exclude: [],
                    stubModules: [],
                    wrap: true,

                    paths: {
                        "wcDocker":"../Code/",
                        "dcl":"../bower_components/dcl"
                    }

                }
            },
            /**
             * Grunt task to compile wcDocker as all-in-one library
             * into Build/wcDocker.min.js
             */
            compileLibR: {
                options: {
                    baseUrl: '.',
                    out: '../Build/wcDocker.min.js',
                    optimize: 'uglify2',
                    name: 'libs/almond',
                    //require-js bootstrap
                    include: [
                        'wcDockerLibrary'
                    ],
                    exclude: [],
                    stubModules: [],
                    wrap: true,

                    paths: {
                        "wcDocker":"../Code/",
                        "dcl":"../bower_components/dcl"
                    }

                }
            },
            /**
             * Grunt task to compile wcDocker as all-in-one and non-minified library
             * into Build/wcDocker.js
             */
            compileLibD: {
                options: {
                    baseUrl: '.',
                    out: '../Build/wcDocker.js',
                    optimize: 'none',
                    name: 'libs/almond',
                    //require-js bootstrap
                    include: [
                        'wcDockerLibrary'
                    ],
                    exclude: [],
                    stubModules: [],
                    wrap: true,
                    paths: {
                        "wcDocker":"../Code/",
                        "dcl":"../bower_components/dcl"
                    }

                }
            }
        },

        cssmin: {

            themes: {
                options: {
                    banner: '/* My minified css file */'
                },
                files: {
                    '../Build/Themes/default.min.css': [
                        '../Themes/default.css'
                    ],
                    '../Build/Themes/bigRed.min.css': [
                        '../Themes/bigRed.css'
                    ],
                    '../Build/Themes/shadow.min.css': [
                        '../Themes/shadow.css'
                    ],
                    '../Build/Themes/ideDark.min.css': [
                        '../Themes/ideDark.css'
                    ],
                    '../Build/wcDocker.min.css': [
                        '../Build/wcDocker.css'
                    ]
                }
            }
        }

    });

    // Load plugins
    grunt.loadNpmTasks("intern");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-less");
    grunt.loadNpmTasks("grunt-contrib-uglify");

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.loadNpmTasks('grunt-contrib-cssmin');



    grunt.loadNpmTasks('grunt-contrib-requirejs');

    grunt.loadNpmTasks('grunt-jsdoc');


    grunt.loadNpmTasks('intern-geezer');
    grunt.loadNpmTasks('grunt-shell');


    // Aliases
    grunt.registerTask('test', [ 'intern:local' ]);


    grunt.registerTask("prepareBuild", [
        "copy:almond"
    ]);

    grunt.registerTask("buildCode", [
        "prepareBuild",
        //Build/wcDocker.js
        "requirejs:compileLibD",
        //Build/wcDocker.min.js
        "requirejs:compileLibR"
    ]);

    grunt.registerTask("buildThemes", [
        //copy themes into Build/
        "copy:themes",
        //copy Code/style.css into Build/
        "copy:style",
        //minify all css from Themes/ into /Build
        "cssmin:themes"
    ]);

    grunt.registerTask("build", [
        "buildCode",
        "buildThemes"
    ]);


};