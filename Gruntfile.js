

module.exports = function(grunt) {
  var markdown = require('node-markdown').Markdown;
  
  require('load-grunt-tasks')(grunt);

  // Project configuration.
  grunt.util.linefeed = '\n';


  grunt.initConfig({
    ngversion: '1.3.13',
    bsversion: '3.3.2',
    modules: [],//to be filled in by build task
    pkg: grunt.file.readJSON('package.json'),
    dist: 'dist',
    filename: 'ngui',
    filenamecustom: '<%= filename %>-custom',
    meta: {
      modules: 'angular.module("ngui", [<%= srcModules %>]);',
      tplmodules: 'angular.module("ngui.tpls", [<%= tplModules %>]);',
      all: 'angular.module("ngui", ["ngui.tpls", <%= srcModules %>]);',
      banner: ['/*',
               ' * <%= pkg.name %>',
               ' * <%= pkg.homepage %>\n',
               ' * Version: <%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>',
               ' * License: <%= pkg.license %>',
               ' */\n'].join('\n')
    },
    clean: {
        dist: [
            '<%= dist %>/*', '!<%= dist %>/.git*'
        ]
    },
    concat: {
      dist: {
        options: {
          banner: '<%= meta.banner %><%= meta.modules %>\n'
        },
        src: [], //src filled in by build task
        dest: '<%= dist %>/<%= filename %>-<%= pkg.version %>.js'
      },
      dist_tpls: {
        options: {
          banner: '<%= meta.banner %><%= meta.all %>\n<%= meta.tplmodules %>\n'
        },
        src: [], //src filled in by build task
        dest: '<%= dist %>/<%= filename %>-tpls-<%= pkg.version %>.js'
      }
    },
    copy: {
      demohtml: {
        options: {
          //process html files with gruntfile config
          processContent: grunt.template.process
        },
        files: [{
          expand: true,
          src: ['**/*.html'],
          cwd: 'misc/demo/',
          dest: 'dist/'
        }]
      },
      demoassets: {
        // ABC : copy demo assets in dist/assets
        files: [{
          expand: true,
          //Don't re-copy html files, we process those
          src: ['**/**/*', '!**/*.html'],
          cwd: 'misc/demo',
          dest: 'dist/'
        }]
      },
	  fonts: {
        src: 'fonts/*',
        dest: 'dist/'
	  }
    },
    uglify: {
      options: {
        banner: '<%= meta.banner %>'
      },
      dist:{
        src:['<%= concat.dist.dest %>'],
        dest:'<%= dist %>/<%= filename %>-<%= pkg.version %>.min.js'
      },
      dist_tpls:{
        src:['<%= concat.dist_tpls.dest %>'],
        dest:'<%= dist %>/<%= filename %>-tpls-<%= pkg.version %>.min.js'
      }
    },
    ngmin: {
      dist:{
        src:['<%= concat.dist.dest %>'],
        dest:'<%= concat.dist.dest %>'
      },
      dist_tpls:{
        src:['<%= concat.dist_tpls.dest %>'],
        dest:'<%= concat.dist_tpls.dest %>'
      }
    },
	css_import: {
		files: {
		  '<%= dist %>/<%= filename %>-<%= pkg.version %>.css': ['css/main.css'],
		},
	},
    cssmin: {
       options: {
			compatibility : 'ie8', //设置兼容模式 
			noAdvanced : true, //取消高级特性 
			keepSpecialComments: 0
       },
       compress: {
           files: {
               '<%= dist %>/<%= filename %>-<%= pkg.version %>.min.css': [
                   '<%= dist %>/<%= filename %>-<%= pkg.version %>.css'
               ]
           }
       }
    },
    html2js: {
      dist: {
        options: {
          module: null, // no bundle module for all the html2js templates
          base: '.'
        },
        files: [{
          expand: true,
          src: ['template/**/*.html'],
          ext: '.html.js'
        }]
      }
    },
    jshint: {
      files: ['src/**/*.js'],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    karma: {
      options: {
        configFile: 'karma.conf.js'
      },
      watch: {
        background: true
      },
      continuous: {
        singleRun: true
      },
      jenkins: {
        singleRun: true,
        colors: false,
        reporters: ['dots', 'junit'],
        browsers: ['Chrome', 'ChromeCanary', 'Firefox', 'Opera', '/Users/jenkins/bin/safari.sh', '/Users/jenkins/bin/ie9.sh', '/Users/jenkins/bin/ie10.sh', '/Users/jenkins/bin/ie11.sh']
      },
      travis: {
        singleRun: true,
        browsers: ['Firefox']
      },
      coverage: {
        preprocessors: {
          'src/*/*.js': 'coverage'
        },
        reporters: ['progress', 'coverage']
      }
    },
    changelog: {
      options: {
        dest: 'CHANGELOG.md',
        templateFile: 'misc/changelog.tpl.md',
        github: 'angular-ui/bootstrap'
      }
    },
    shell: {
      //We use %version% and evluate it at run-time, because <%= pkg.version %>
      //is only evaluated once
      'release-prepare': [
        'grunt before-test after-test',
        'grunt version', //remove "-SNAPSHOT"
        'grunt changelog'
      ],
      'release-complete': [
        'git commit CHANGELOG.md package.json -m "chore(release): v%version%"',
        'git tag %version%'
      ],
      'release-start': [
        'grunt version:minor:"SNAPSHOT"',
        'git commit package.json -m "chore(release): Starting v%version%"'
      ]
    },
    // ABC : not used.
    ngdocs: {
      options: {
        dest: 'dist/docs',
        scripts: [
          'angular.js',
          '<%= concat.dist_tpls.dest %>'
        ],
        styles: [
          'docs/css/style.css'
        ],
        navTemplate: 'docs/nav.html',
        title: 'ui-bootstrap',
        html5Mode: false
      },
      api: {
        src: ['src/**/*.js', 'src/**/*.ngdoc'],
        title: 'API Documentation'
      }
    },
    delta: {
      // ABC : used in the watch task
      docs: {
        files: ['misc/demo/index.html'],
        tasks: ['after-test']
      },
      html: {
        files: ['template/**/*.html'],
        tasks: ['html2js', 'karma:watch:run']
      },
      js: {
        files: ['src/**/*.js'],
        //we don't need to jshint here, it slows down everything else
        tasks: ['karma:watch:run']
      }
    },
    connect: {
      server: {
        options: {
          port: 9300,
          hostname: '0.0.0.0',
          livereload: 9301,
          middleware: function(connect) {
            return [
                require('connect-livereload')({
                    port: 9301
                }),
                connect.static(require('path').resolve('bower_components')),
                connect.static(require('path').resolve('dist'))
            ];
          }
        }
      }
    },
    connectDelta: {
      // ABC : used in the watch task
      docs: {
        files: ['misc/demo/**/*'],
        tasks: ['copy']
      },
      html: {
        files: ['template/**/*.html'],
        tasks: ['html2js', 'build']
      },
      js: {
        files: ['src/**/*.js'],
        //we don't need to jshint here, it slows down everything else
        tasks: ['build','copy']
      },
	  css: {
		files: ['src/**/*.css'],
		tasks: ['css']
	  },
	  fonts: {
		files: ['fonts/*'],
		tasks: ['copy:fonts']
	  }
    },
  });
  grunt.registerTask('css', ['css_import', 'cssmin']);
  grunt.renameTask('watch', 'connectDelta');
  grunt.registerTask('server', ['connect:server','connectDelta']);
  //register before and after test tasks so we've don't have to change cli
  //options on the goole's CI server
  grunt.registerTask('before-test', ['enforce', 'jshint', 'html2js']);
  grunt.registerTask('after-test', ['build', 'copy']);

  //Rename our watch task to 'delta', then make actual 'watch'
  //task build things, then start test server

  grunt.renameTask('watch', 'delta');
  grunt.registerTask('watch', ['before-test', 'after-test', 'karma:watch', 'delta']);


  // Default task.
  grunt.registerTask('default', ['before-test', 'test', 'after-test']);

  grunt.registerTask('enforce', 'Install commit message enforce script if it doesn\'t exist', function() {
    if (!grunt.file.exists('.git/hooks/commit-msg')) {
      grunt.file.copy('misc/validate-commit-msg.js', '.git/hooks/commit-msg');
      require('fs').chmodSync('.git/hooks/commit-msg', '0755');
    }
  });

  //Common ngui module containing all modules for src and templates
  //findModule: Adds a given module to config
  var foundModules = {};
  function findModule(name) {
    if (foundModules[name]) { return; }
    foundModules[name] = true;

    function breakup(text, separator) {
      return text.replace(/[A-Z]/g, function (match) {
        return separator + match;
      });
    }
    function ucwords(text) {
      return text.replace(/^([a-z])|\s+([a-z])/g, function ($1) {
        return $1.toUpperCase();
      });
    }
    function enquote(str) {
      return '"' + str + '"';
    }

    var module = {
      name: name,
      libraryPrefix: 'ngui',
      moduleName: enquote('ngui.' + name),
      displayName: ucwords(breakup(name, ' ')),
      srcFiles: grunt.file.expand('src/'+name+'/*.js'),
      tplFiles: grunt.file.expand('template/'+name+'/*.html'),
      tpljsFiles: grunt.file.expand('template/'+name+'/*.html.js'),
      tplModules: grunt.file.expand('template/'+name+'/*.html').map(enquote),
      dependencies: dependenciesForModule(name),
      docs: {
        md: grunt.file.expand('src/'+name+'/docs/*.md')
          .map(grunt.file.read).map(markdown).join('\n'),
        js: grunt.file.expand('src/'+name+'/docs/*.js')
          .map(grunt.file.read).join('\n'),
        html: grunt.file.expand('src/'+name+'/docs/*.html')
          .map(grunt.file.read).join('\n')
      }
    };
    // ABC : recursively add modules to grunt.config('modules')
    module.dependencies.forEach(findModule);
    grunt.config('modules', grunt.config('modules').concat(module));
  }

  function dependenciesForModule(name) {
    var deps = [];
    grunt.file.expand('src/' + name + '/*.js')
    .map(grunt.file.read)
    .forEach(function(contents) {
      //Strategy: find where module is declared,
      //and from there get everything inside the [] and split them by comma
      var moduleDeclIndex = contents.indexOf('angular.module(');
      var depArrayStart = contents.indexOf('[', moduleDeclIndex);
      var depArrayEnd = contents.indexOf(']', depArrayStart);
      var dependencies = contents.substring(depArrayStart + 1, depArrayEnd);
      dependencies.split(',').forEach(function(dep) {
        if (dep.indexOf('ngui.') > -1) {
          var depName = dep.trim().replace('ngui.','').replace(/['"]/g,'');
          if (deps.indexOf(depName) < 0) {
            deps.push(depName);
            //Get dependencies for this new dependency
            deps = deps.concat(dependenciesForModule(depName));
          }
        }
      });
    });
    return deps;
  }

  grunt.registerTask('dist', 'Override dist directory', function() {
    var dir = this.args[0];
    if (dir) { grunt.config('dist', dir); }
  });

  grunt.registerTask('build', 'Create bootstrap build files', function() {
    var _ = grunt.util._;

    //If arguments define what modules to build, build those. Else, everything
    if (this.args.length) {
      this.args.forEach(findModule);
      // ABC : Build file will have a different name pattern, eg ui-bootstrap-custom-0.11.0-SNAPSHOT.js
      grunt.config('filename', grunt.config('filenamecustom'));
    } else {
      // ABC : If no arguments build all modules which names are src subfolders.
      grunt.file.expand({
        filter: 'isDirectory', cwd: '.'
      }, 'src/*').forEach(function(dir) {
        findModule(dir.split('/')[1]);
      });
    }

    var modules = grunt.config('modules');
    grunt.config('srcModules', _.pluck(modules, 'moduleName'));
    grunt.config('tplModules', _.pluck(modules, 'tplModules').filter(function(tpls) { return tpls.length > 0;} ));
    grunt.config('demoModules', modules
      .filter(function(module) {
        return module.docs.md && module.docs.js && module.docs.html;
      })
      .sort(function(a, b) {
        if (a.name < b.name) { return -1; }
        if (a.name > b.name) { return 1; }
        return 0;
      })
    );

    var srcFiles = _.pluck(modules, 'srcFiles');
    var tpljsFiles = _.pluck(modules, 'tpljsFiles');
    //Set the concat task to concatenate the given src modules
    grunt.config('concat.dist.src', grunt.config('concat.dist.src')
                 .concat(srcFiles));
    //Set the concat-with-templates task to concat the given src & tpl modules
    grunt.config('concat.dist_tpls.src', grunt.config('concat.dist_tpls.src')
                 .concat(srcFiles).concat(tpljsFiles));

    grunt.task.run(['concat', 'ngmin', 'uglify', 'css']);
  });

  grunt.registerTask('test', 'Run tests on singleRun karma server', function () {
    //this task can be executed in 3 different environments: local, Travis-CI and Jenkins-CI
    //we need to take settings for each one into account
    if (process.env.TRAVIS) {
      grunt.task.run('karma:travis');
    } else {
      var isToRunJenkinsTask = !!this.args.length;
      if(grunt.option('coverage')) {
        var karmaOptions = grunt.config.get('karma.options'),
          coverageOpts = grunt.config.get('karma.coverage');
        grunt.util._.extend(karmaOptions, coverageOpts);
        grunt.config.set('karma.options', karmaOptions);
      }
      grunt.task.run(this.args.length ? 'karma:jenkins' : 'karma:continuous');
    }
  });

  function setVersion(type, suffix) {
    var file = 'package.json';
    var VERSION_REGEX = /([\'|\"]version[\'|\"][ ]*:[ ]*[\'|\"])([\d|.]*)(-\w+)*([\'|\"])/;
    var contents = grunt.file.read(file);
    var version;
    contents = contents.replace(VERSION_REGEX, function(match, left, center) {
      version = center;
      if (type) {
        version = require('semver').inc(version, type);
      }
      //semver.inc strips our suffix if it existed
      if (suffix) {
        version += '-' + suffix;
      }
      return left + version + '"';
    });
    grunt.log.ok('Version set to ' + version.cyan);
    grunt.file.write(file, contents);
    return version;
  }

  grunt.registerTask('version', 'Set version. If no arguments, it just takes off suffix', function() {
    setVersion(this.args[0], this.args[1]);
  });

  grunt.registerMultiTask('shell', 'run shell commands', function() {
    var self = this;
    var sh = require('shelljs');
    self.data.forEach(function(cmd) {
      cmd = cmd.replace('%version%', grunt.file.readJSON('package.json').version);
      grunt.log.ok(cmd);
      var result = sh.exec(cmd,{silent:true});
      if (result.code !== 0) {
        grunt.fatal(result.output);
      }
    });
  });

  return grunt;
};
