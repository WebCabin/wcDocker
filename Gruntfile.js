/*global module */
module.exports = function (grunt) {


    function log(err, stdout, stderr, cb) {
        console.log(arguments);
        cb();
    }

    var outprop = "amdoutput";
    var outdir = "./build/";
    var tmpdir = "./tmp/";

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        //not needed anymore, Config to allow to concatenate files to generate the layer.
        concat: {
            options: {
                banner: "<%= " + outprop + ".header%>",
                sourceMap: true
            },
            dist: {
                src: "<%= " + outprop + ".modules.abs %>",
                dest: outdir + "<%= " + outprop + ".layerPath %>"
            }
        },
        //not needed anymore,
        clean: {
            out: [outdir],
            temp: [tmpdir]
        },
        //not needed anymore, Config to allow to concatenate files to generate the layer.
        uglify: {
            options: {
                mangle: false
            },
            my_target: {
                files: {
                    'build/bower_components/build.js': ['build/bower_components/app.js']
                }
            }
        },



        copy: {
            plugins: {
                expand: true,
                cwd: tmpdir,
                src: "<%= " + outprop + ".plugins.rel %>",
                dest: outdir
            },
            themes:{
                src: "Themes/*.*",
                dest: "Build/"
            },
            style:{
                src: "Code/style.css",
                dest: "Build/wcDocker.css"
            },
            /**
             * The build tasks requires almond.js in Compiler/libs.
             * Since its installed by "bower install" in the root
             * directory, it needs to be copied over
             */
            almond:{
                src: "bower_components/almond/almond.js",
                dest: "Compiler/libs/almond.js"
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

        //not needed anymore
        // Task for compiling less files into CSS files
        less : {
            // Compile theme independent files
            transitions: {
                expand: true,
                cwd: "themes/common/transitions",
                src: ["*.less"],
                dest: "themes/common/transitions",
                ext: ".css"
            },

            // Infrastructure per-theme files
            common : {
                files: [
                    {
                        expand: true,
                        src: ["themes/*/*.less", "!themes/common/*.less", "!**/variables.less", "!**/common.less"],
                        ext: ".css"
                    }
                ]
            },

            // Compile less code for each widget
            widgets : {
                files: [
                    {
                        expand: true,
                        src: [
                            "*/themes/*/*.less",
                            "samples/ExampleWidget/themes/*/*.less",
                            "!{dijit,mobile}/themes/*/*.less"
                        ],
                        ext: ".css"
                    }
                ]
            }
        },
        //not needed anymore
        // convert CSS files to JS files
        cssToJs : {
            // conversions removing the CSS files
            replace: {
                src: [
                    // infrastructure
                    "themes/*/*.css",
                    "!themes/common/*.css",
                    "themes/common/transitions/*.css",

                    // widgets
                    "*/themes/*/*.css",
                    "samples/ExampleWidget/themes/*/*.css",
                    "!{dijit,mobile}/themes/*/*.css"
                ],
                options: {
                    remove: true
                }
            },

            // conversions keeping the CSS files
            keep: {
                src: [
                    // some apps may want to load defaultapp.css as a JS file rather than a CSS file.
                    "themes/defaultapp.css",

                    // files originally authored as CSS
                    "tests/unit/css/*.css"
                ]
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

        "jsdoc-amddcl": {
            "plugins": [
                "plugins/markdown"
            ],
            docs: {
                files: [
                    {
                        src: [
                            "./Code/*.js",
                            "./README.md",
                            "!./node_modules"
                        ]

                    }
                ]
            },
            export: {
                files: [
                    {
                        args: [
                            "-X"
                        ],
                        src: [
                            ".",
                            "./README.md",
                            "./package.json"
                        ],
                        dest: "/tmp/doclets.json"
                    }
                ]
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
                    baseUrl: 'Compiler',

                    out: 'Build/demo.js',
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
                    baseUrl: 'Compiler',
                    out: 'Build/wcDocker.min.js',
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
                    baseUrl: 'Compiler',
                    out: 'Build/wcDocker.js',
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

        //not needed anymore
        shell: {
            subfolderLs: {
                command: 'ls',
                options: {
                    stderr: false,
                    execOptions: {
                        cwd: 'docs'
                    }
                }
            },
            themes: {
                command: [
                    'cd Code/client/src/light-blue-wrapbootstrap',
                    'ls',
                    'grunt --gruntfile GruntfileAcc.js --target=html-transparent-small dist-compass'
                ].join('&&'),

                options: {
                    stderr: false

                }
            },
            xide: {
                command: [
                    'cd Code/utils',
                    //'forever -s stop nxappmain/xide.js',
                    'forever start nxappmain/xide.js'
                ].join('&&'),

                options: {
                    stderr: true,
                    failOnError:false,
                    cwd:'Code/utils'

                }
            },
            deviceServer: {
                command: [
                    'cd Code/utils',
                    'ls',
                    //'forever -s stop nxappmain/server.js',
                    'forever start nxappmain/server.js'
                ].join('&&'),

                options: {
                    stderr: true,
                    failOnError:false,
                    cwd:'Code/utils'
                }
            }
        },

        cssmin: {

            themes: {
                options: {
                    banner: '/* My minified css file */'
                },
                files: {
                    'Build/Themes/default.min.css': [
                        'Themes/default.css'
                    ],
                    'Build/Themes/bigRed.min.css': [
                        'Themes/bigRed.css'
                    ],
                    'Build/Themes/shadow.min.css': [
                        'Themes/shadow.css'
                    ],
                    'Build/Themes/ideDark.min.css': [
                        'Themes/ideDark.css'
                    ],
                    'Build/wcDocker.min.css': [
                        'Build/wcDocker.css'
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

    grunt.loadNpmTasks("jsdoc-amddcl");

    grunt.loadNpmTasks('intern-geezer');
    grunt.loadNpmTasks('grunt-shell');


    // Aliases
    //grunt.registerTask("css", ["less", "cssToJs"]);
    grunt.registerTask("jsdoc", "jsdoc-amddcl");
    grunt.registerTask('test', [ 'intern:local' ]);
    grunt.registerTask('themes', ['shell:themes']);
    grunt.registerTask('services', [
        'shell:deviceServer',
        'shell:xide'
    ]);

    grunt.registerTask("amdbuild", function (amdloader) {
        var name = this.name, layers = grunt.config(name).layers;
        layers.forEach(function (layer) {
            grunt.task.run("amddepsscan:" + layer.name + ":" + name + ":" + amdloader);
            grunt.task.run("amdserialize:" + layer.name + ":" + name + ":" + outprop);
            grunt.task.run("concat");
            grunt.task.run("copy:plugins");
        });
    });

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