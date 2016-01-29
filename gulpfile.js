/**
 * Created by jandres on 28/01/16.
 */
var path = require('path'),
    gulp = require('gulp'),
    less = require('gulp-less'),
    rename = require("gulp-rename"),
    minifyCSS = require('gulp-minify-css'),
    browserify = require('gulp-browserify'),
    uglify = require('gulp-uglify');

var paths = {
    js: ['./src/**/*.js'],
    less: ['./style/**/*.less']
};

// LESS/CSS section.
gulp.task('css', function () {
    gulp.src('./style/snap.less')
        .pipe(less({
            paths: [path.join(__dirname, 'styles', 'includes')]
        }))
        .pipe(gulp.dest('./dist'))
        .pipe(minifyCSS({keepBreaks: false}))
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('./dist'));
});

// JS section.
gulp.task('js', function() {
    gulp.src('./src/snap.js')
        .pipe(gulp.dest('./dist'))
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('./dist'));
});

// Watcher section.
gulp.task('watchers', function () {
    gulp.watch(paths.less, ['css']);
    gulp.watch(paths.js, ['js']);
});

gulp.task('default', ['css', 'js', 'watchers']);