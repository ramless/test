var gulp = require('gulp');
var gulpif = require('gulp-if');
var plumber = require('gulp-plumber');
var filter = require('gulp-filter');
var pugInheritance = require('yellfy-pug-inheritance');
var pug = require('gulp-pug');
var sourcemaps = require('gulp-sourcemaps');
var stylus = require('gulp-stylus');
var sprite = require("gulp.spritesmith");
var browserSync = require('browser-sync').create();
var csso = require('gulp-csso');
var nib = require('nib');
var cleanCSS = require('gulp-clean-css');

var reload = browserSync.reload;
// Компилятор Стилей
gulp.task('stylus', function() {
  return gulp.src('src/styles/*-gulp.styl')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(stylus({
      use: [nib()],
      'include css': true,
      compress: true
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('build/css/'))
    .pipe(browserSync.stream());
});

gulp.task("sprites", gulp.series(function(done) { 
    var spriteOutput = gulp.src( "src/images/sprites/*.png")
        .pipe(sprite({
            imgName: "sprite_gulp.png",
            imgPath: "../img/sprite_gulp.png",
            cssName : "sprites.styl",
            algorithm: 'binary-tree',
            padding: 10,
            //retina
            retinaImgName: "sprite_retina_gulp.png",
            retinaImgPath: "../img/sprite_retina_gulp.png",
            retinaSrcFilter: 'src/images/sprites/*@2x.png'
        }) );
    spriteOutput.css.pipe(gulp.dest("src/styles/mixins"));
    spriteOutput.img.pipe(gulp.dest("build/img"));
    done();
}));

let pugInheritanceCache = {};
// Watch Task
gulp.task('watch', () => {
  global.watch = true;
  browserSync.init(['build/css/*.css', 'build/*.html'], {
      server: "./build/"
  });
  gulp.watch(["src/images/sprites/*.png"], gulp.series('sprites'));
  gulp.watch(['src/styles/**/*.styl'], gulp.series('stylus'));
  gulp.watch(['src/pug/**/*.pug'], gulp.series('pug'))
    .on('all', (event, filepath) => {
      global.changedTempalteFile = filepath.replace(/\\/g, '/');
    });
    gulp.watch("build/*.html").on("change", reload);
});
// Генерация Pug проверка того что изменилось
function pugFilter(file, inheritance) {
  const filepath = `src/pug/${file.relative}`;
  if (inheritance.checkDependency(filepath, global.changedTempalteFile)) {
    console.log(`Compiling: ${filepath}`);
    return true;
  }
  return false;
}
// Генерация Pug
gulp.task('pug', () => {
  return new Promise((resolve, reject) => {
    const changedFile = global.changedTempalteFile;
    const options = {
      changedFile,
      treeCache: pugInheritanceCache
    };

    pugInheritance.updateTree('src/pug', options).then((inheritance) => {
      // Save cache for secondary compilationswatch
      pugInheritanceCache = inheritance.tree;

      return gulp.src('src/pug/*.pug')
        .pipe(gulpif(global.watch, filter((file) => pugFilter(file, inheritance))))
        .pipe(plumber())
        .pipe(pug({ pretty: true }))
        .pipe(gulp.dest('build'))
        .on('error', console.log)
        .on('end', resolve);
    });
  });
});
gulp.task('default', gulp.series('pug', 'sprites', 'stylus', 'watch'));
