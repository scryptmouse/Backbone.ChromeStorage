var fs = require('fs');

var jshint_config = JSON.parse(fs.readFileSync('.jshintrc', 'utf8'));

module.exports = function(grunt) {
  grunt.initConfig({
    min: {
      dist: {
        src: ['backbone.chromestorage.js'],
        dest: 'backbone.chromestorage.min.js'
      }
    },
    lint: {
      files: ['backbone.chromestorage.js']
    },
    jshint: {
      options: jshint_config
    },
    docco_husky: {
      project_name: 'Backbone.ChromeStorage',
      files: ['backbone.chromestorage.js']
    }
  });

  grunt.registerTask('default', 'lint');

  grunt.registerTask('release', 'lint min docco_husky');

  grunt.loadNpmTasks('grunt-docco-husky');
};
