/*global module */
module.exports = function (grunt) {


    function log(err, stdout, stderr, cb) {
        console.log(arguments);
        cb();
    }

    // Project configuration.
    grunt.initConfig({
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
};