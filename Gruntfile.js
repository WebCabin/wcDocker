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
        amdloader: {
            baseUrl: "bower_components",
            paths: {
                'wcDocker':'../Code'
            },

            // Unfortunately this is needed for the jquery plugin.
            // It's automatically handled by the plugin itself at runtime, but not during builds.
            map: {

            }
        },
        amdbuild: {
            dir: tmpdir,

            // List of layers to build.
            layers: [
                // Test build for jquery plugin.  Should contain main test js file and a few jquery modules.
                {
                    name: "app",
                    include: [
                        // Modules and layers listed here, and their dependencies, will be added to the layer.
                        "../buildMain"
                    ]
                }
            ]
        },
        // Config to allow to concatenate files to generate the layer.
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

        copy: {
            plugins: {
                expand: true,
                cwd: tmpdir,
                src: "<%= " + outprop + ".plugins.rel %>",
                dest: outdir
            }
        },

        clean: {
            out: [outdir],
            temp: [tmpdir]
        },

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

        pkg: grunt.file.readJSON("package.json"),
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

        // !! This is the name of the task ('requirejs')
        _requirejs: {
            compile: {

                // !! You can drop your app.build.js config wholesale into 'options'
                options: {
                    /*appDir: "app",*/
                    baseUrl: "./",
                    dir:'build',
                    _optimize: 'uglify2',
                    optimize: 'none',
                    mainConfigFile:'./main.js',
                    optimizeCss:'none',
                    modules:[
                        {
                            name:'buildMain'
                        }
                    ],
                    logLevel: 0,
                    findNestedDependencies: true,
                    fileExclusionRegExp: /^\./,
                    inlineText: true
                }
            }
        },
        requirejs: {
            compile: {

                // !! You can drop your app.build.js config wholesale into 'options'
                options: {
                    appDir: "./app",
                    baseUrl: "./",
                    dir:'build',
                    optimize: 'uglify2',
                    _optimize: 'none',
                    mainConfigFile:'./main.js',
                    optimizeCss:'none',
                    logLevel: 0,
                    include:[
                        'bower_components/dcl'
                    ],
                    modules:[{
                        name:'demo'
                    }],
                    /*findNestedDependencies: true,*/
                    fileExclusionRegExp: /^\.|node_modules|Compiler|build/,
                    inlineText: true
                }
            }
        },



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

    grunt.loadNpmTasks("grunt-amd-build");
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
    grunt.registerTask("build", [
        "clean:out",
        "clean:temp",
        "amdbuild:amdloader",
        "uglify:my_target"
    ]);
};