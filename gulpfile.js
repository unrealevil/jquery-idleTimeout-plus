var gulp = require('gulp');
var stripCode = require('gulp-strip-code');
var stripDebug = require('gulp-strip-debug');
var stripLine = require('gulp-strip-line');
var rename = require("gulp-rename");
var replace = require('gulp-replace');
var uglify = require('gulp-uglify');
var del = require('del');

gulp.task('clean', function () {
    return del('dist/js/*');
});

gulp.task('standard', ['clean'], function () {
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
            /--strip_iframe--/
        ]))
        .pipe(stripDebug())
        .pipe(gulp.dest('dist/js'));
});

gulp.task('iframe',['clean','standard'],  function () {
    return gulp.src(['src/jquery-idleTimeout-plus.js'])
        .pipe(stripCode({
            start_comment: '--strip_testing_begin--',
            end_comment: '--strip_testing_end--'
        }))
        .pipe(stripLine([
            /--strip_testing--/,
            /--strip_iframe_/
        ]))
        .pipe(stripDebug())
        .pipe(replace(/\/\* --strip_iframe--.*/g,''))
        .pipe(rename('jquery-idleTimeout-plus-iframe.js'))
        .pipe(gulp.dest('dist/js'));
});

gulp.task('mini', ['clean','standard','iframe'], function () {
    return gulp.src(['dist/js/*.js'])
        .pipe(uglify())
        .pipe(rename({suffix: ".min"}))
        .pipe(gulp.dest('dist/js'))
});

gulp.task('default', ['clean','standard','iframe','mini']);
