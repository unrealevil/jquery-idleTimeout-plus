/* eslint-disable */
var gulp = require('gulp');
var stripCode = require('gulp-strip-code');
var stripLine = require('gulp-strip-line');
var rename = require("gulp-rename");
var replace = require('gulp-replace');
var uglify = require('gulp-uglify');
var del = require('del');
var cleanCSS = require('gulp-clean-css');

gulp.task('clean', function() {
  del('dist/js/*');
  return del('dist/css/*');
});

gulp.task('standard', ['clean'], function() {
  return gulp.src(['src/jquery-idleTimeout-plus.js'])
    .pipe(stripCode({
      start_comment: '--strip_testing_begin--',
      end_comment: '--strip_testing_end--'
    }))
    .pipe(stripCode({
      start_comment: '--strip_iframe_begin--',
      end_comment: '--strip_iframe_end--'
    }))
    .pipe(stripLine([
      /--strip_testing--/,
      /--strip_iframe--/,
      /console.log/,
      /@namespace/,
      /eslint-disable-next-line/
    ]))
    .pipe(replace(/({|;)\s*\n\n+(\s*)/g,'$1\n$2'))
    .pipe(replace(/({|;)(\s+.*)\n\n+(\s*)/g,'$1$2\n$3'))
    .pipe(gulp.dest('dist/js'));
});

gulp.task('iframe', ['clean', 'standard'], function() {
  return gulp.src(['src/jquery-idleTimeout-plus.js'])
    .pipe(stripCode({
      start_comment: '--strip_testing_begin--',
      end_comment: '--strip_testing_end--'
    }))
    .pipe(stripLine([
      /--strip_testing--/,
      /--strip_iframe_/,
      /console.log/,
      /@namespace/,
      /eslint-disable-next-line/
    ]))
    .pipe(replace(/\s\/\* --strip_iframe--.*/g, ''))
    .pipe(replace(/({|;)\s*\n\n+(\s*)/g,'$1\n$2'))
    .pipe(replace(/({|;)(\s+.*)\n\n+(\s*)/g,'$1$2\n$3'))
    .pipe(rename('jquery-idleTimeout-plus-iframe.js'))
    .pipe(gulp.dest('dist/js'));
});

gulp.task('mini', ['clean', 'standard', 'iframe'], function() {
  return gulp.src(['dist/js/*.js'])
    .pipe(uglify())
    .pipe(rename({suffix: ".min"}))
    .pipe(gulp.dest('dist/js'))
});

gulp.task('css', ['clean'], function() {
  return gulp.src(['src/*.css'])
    .pipe(gulp.dest('dist/css'))
});

gulp.task('minicss', ['clean', 'css'], function() {
  return gulp.src(['dist/css/*.css'])
    .pipe(cleanCSS())
    .pipe(rename({suffix: ".min"}))
    .pipe(gulp.dest('dist/css'))
});

gulp.task('default', ['clean', 'standard', 'iframe', 'mini', 'css', 'minicss']);
