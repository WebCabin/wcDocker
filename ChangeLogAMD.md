###Status

#### Converting to AMD/DCL/Require-JS compatible classes/modules: done
#### Converting comments jsDoc module tags: 99% done
#### Creating grunt tasks to compile themes and library: done
#### Creating grunt tasks to API docs: missing
#### Creating grunt tasks for unit-testing (at least the base): missing

#### Open issues:

- Code/iframe::docker() not returning a docker instance

to reproduce or fix it: grab a fresh copy and enable in indexDev.html "tutorials" = true


- index.html: for some reason ./demo.js is evaluated before ./Build/wcDocker.js

I had to put a delay in demo.js. However, the very same demo exists also as AMD version in Code/samples/demoAMD.js
which is used by indexDev.html



###General changes for developers

#### Require-JS - Setup & Configuration

Remarks, please run bower install after checkout!

1. Setup, include the Require.JS

    
        <!-- include Require-JS --->
        <script src="bower_components/requirejs/require.js"></script>
    

2. Configure Require.JS

    
        <script type="text/javascript">    
            require.config({
                baseUrl: "./bower_components",
                packages: [
                    {
                        name: 'dcl',
                        location: './dcl'   //points to bower_components/dcl
                    },
                    {
                        name: 'wcDocker',
                        location: '../Code'
                    }
                ]
            });
        </script>
        

3. Pull in modules

        
        <script type="text/javascript">    
            //setup demo module
            require.config({
                config: {    
                    'wcDocker/samples/demoAMD':{
                        //  enable/disable theme builder
                        themeBuilder: true,
                        //  enable/disable tutorials
                        tutorials:false
                    }
                }
            });            
            try {                
                //require demo (your main)
                require([
                    "wcDocker/samples/demoAMD"
                ], function (demo) {
                    //nada, all done in demo
                });
            }catch(e){
                console.error('error loading demo ' + e , e);
                console.dir(e.stack);
            }
        </script>

#### DCL 

Since we use now DCL for OOP, all classes have been wrapped 
into DCL classes. Furthermore, a base class ./Code/base has been
added to all wcDocker classes
 
Please follow for details [here](www.dcljs.org/docs/cheatsheet)


 
#### Build

Everything has been defined as grunt-tasks in Gruntfile.js
 
#### build code & themes:
 
    #grunt build

#### Remarks: 

- this will compile a minified version of the wcDocker lib, including
everything automatically what has been put into Compiler/wcDockerLibrary.js

- The build contains a very small version of require.js called "Almond" which
has been also developed by require.js






