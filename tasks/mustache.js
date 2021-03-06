/*
 * build-bootstrap
 * https://github.com/jonschlinkert/build-bootstrap
 *
 * Copyright (c) 2012 Jon Schlinkert
 * Credit: inspired by @ctalkington
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {

  // Grunt utilities.
  var task   = grunt.task,
    file     = grunt.file,
    utils    = grunt.util,
    log      = grunt.log,
    verbose  = grunt.verbose,
    fail     = grunt.fail,
    option   = grunt.option,
    config   = grunt.config,
    template = grunt.template,
    _        = utils._;

  // external dependencies
  var fs     = require('fs'),
      hogan  = require('hogan');


  // Please see the grunt documentation for more information regarding task and
  // helper creation: https://github.com/gruntjs/grunt/blob/master/docs/toc.md

  // ==========================================================================
  // TASKS
  // ==========================================================================
  grunt.registerMultiTask('mustache', 'Compile mustache files to HTML with hogan.js', function() {

    var data     = this.data,
        src      = grunt.file.expandFiles(this.file.src),
        dest     = grunt.template.process(data.dest),

      // Options are set in gruntfile
      defaults   = {
        production: false,
        docs: false,
        title: 'Awesome Site',
        layout: 'docs/templates/layout.mustache',
        paths: {},
        partials: {},
        partialsData: {}
      },
      options = _.extend(defaults, this.data.options || {});

      !src && grunt.warn('Missing src property.')
      if(!src) return false;

      !dest && grunt.warn('Missing dest property')
      if(!dest) return false;

    var done     = this.async();
    var srcFiles = file.expandFiles(src);

    if(options.paths.partials) {

      var partials = grunt.file.expandFiles(options.paths.partials);
      log.writeln('Compiling Partials...');
      var filenameRegex = /[^\\\/:*?"<>|\r\n]+$/i;

      partials.forEach(function(filepath) {
        var filename = _.first(filepath.match(filenameRegex)).replace(/\.mustache$/, '');
        log.writeln(filename.magenta);

        var dataFilepath = filepath.replace(/\.mustache$/, '.json');

        var partial = fs.readFileSync(filepath, 'utf8');
        options.partials[filename] = hogan.compile(partial, {
          sectionTags: [{
            o: '_i',
            c: 'i'
          }]
        })

        // if a data file exists, read in the data
        if(fs.existsSync(dataFilepath)) {
          options.partialsData[filename] = grunt.file.readJSON(dataFilepath);
        }

      });
      log.writeln();
    }

    try {
      options.layout = fs.readFileSync(options.layout, 'utf8')
      options.layout = hogan.compile(options.layout, {
        sectionTags: [{
          o: '_i',
          c: 'i'
        }]
      })
    } catch(err) {
      grunt.warn(err) && done(false)
      return
    };

    srcFiles.forEach(function(filepath) {
      var filename = _.first(filepath.match(/[^\\\/:*?"<>|\r\n]+$/i)).replace(/\.mustache$/, '')

      grunt.helper('hogan', filepath, filename, options, function(err, result) {
        err && grunt.warn(err) && done(false)
        if(err) return

        file.write(dest.replace('FILE', filename), result)
      })
    })

    done();
  });

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  grunt.registerHelper('hogan', function(src, filename, options, callback) {
    log.writeln('Compiling ' + filename.magenta);

    var page                = fs.readFileSync(src, 'utf8'),
        html                = null,
        layout              = options.layout,
        context             = {};
        context[filename]   = 'active';
        context._i          = true;
        context.production  = options.production;
        context.docs        = options.docs;

    var title               = _.template("<%= page == 'Index' ? site : page + ' · ' + site %>")
    context.title           = title({
      page: _(filename).humanize().replace('css', 'CSS'),
      site: options.title
    });

    try {
      page = hogan.compile(page, {
        sectionTags: [{
          o: '_i',
          c: 'i'
        }]
      })

      context = _.extend(context, options.partialsData);
      options.partials.body = page;
      page = layout.render(context, options.partials)
      callback(null, page)
    } catch(err) {
      callback(err)
      return
    };
  });
};
