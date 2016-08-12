var gulp = require('gulp');
var args = require('yargs').argv;
var config = require('./gulp.config')();
var del = require('del');

// all gulp plugins
var $ = require('gulp-load-plugins')({ lazy: true });
//vvf: replaced all of these below with the one line above, but need to insall these to use it
//var util = require('gulp-util');
//var jshint = require('gulp-jshint');
//var jscs = require('gulp-jscs');
//var gulpprint = require('gulp-print');
//var gulpif = require('gulp-if');

gulp.task('vet', function () {
	log('Analyzing source with JSHint and JCSC');
	return gulp
		.src(config.alljs)
		.pipe($.if(args.verbose, $.print()))
		.pipe($.jscs())
		.pipe($.jshint())
		.pipe($.jshint.reporter('jshint-stylish', { verbose: true }))
		.pipe($.jshint.reporter('fail'));
});

gulp.task('styles', ['clean-styles'], function () {
	log('Compiling Less to CSS');
	return gulp
		.src(config.less)
		.pipe($.plumber())
		.pipe($.less())
		//.on('error',errorLogger)
		.pipe($.autoprefixer({browsers: ['last 2 version', '> 5%']}))
		.pipe(gulp.dest(config.temp));
});

gulp.task('clean', function (cb) {
	var deleteConfig = [].concat(config.build, config.temp);
	return clean(deleteConfig, cb);
});

gulp.task('clean-styles', function (cb) {
	var files = config.temp + '**/*.css';
	return clean(files, cb);
});

gulp.task('clean-fonts', function (cb) {	
	return clean(config.build + 'fonts/**/*.*', cb);
});

gulp.task('clean-images', function (cb) {	
	clean(config.build + 'images/**/*.*', cb);
});

gulp.task('clean-code', function (cb) {
	var files = [].concat(
		config.temp + '**/*.js',
		config.build + '**/*.html',
		config.build + 'js/*.js'
	);	
	clean(files,cb);
});

gulp.task('less-watcher', function () {
	gulp.watch([config.less], ['styles']);
});

/*
** NOTE: This does not work and is incomplete for several chapters because fo breaking changes
*/
gulp.task('optimise', ['inject'], function () {
	log('Optimising the JS, CSS and HTML');
	var templateCache = config.temp + config.templateCache.file;	
	var assets = $.useref.assets({ searchPath : './'});
	var cssFilter = $.filter('**/*.css');
	var jsFilter = $.filter('**/*.js');
	
	return gulp
		.src(config.index)
		.pipe($.plumber())
		.pipe($.inject(gulp.src(templateCache, { read: false }, { starttag: '<!-- inject:templates:js -->'})))
		.pipe(assets)
		.pipe(cssFilter)
		.pipe($.csso())
		.pipe(jsFilter)
		.pipe($.uglify())
		.pipe(cssFilter.restore())	
		.pipe(jsFilter.restore())
		.pipe(assets.restore())
		.pipe($.useref())
		.pipe(gulp.dest(config.build));
});

gulp.task('templatecache', function () {
	log('Creating AngularJS $templateCache');
	return gulp
		.src(config.htmltemplates) 
		.pipe($.minifyHtml({ empty: true }))
		.pipe($.angularTemplatecache(config.templateCache.file, config.templateCache.options))
		.pipe(gulp.dest(config.temp));
});

gulp.task('wiredep', function () {
	log('Wire up the bower css js and our app js into the html');
	var wiredep = require('wiredep').stream;
	return gulp
		.src(config.index)
		.pipe(wiredep(config.getWiredepDefaultOptions))
		.pipe($.inject(gulp.src(config.js)))
		.pipe(gulp.dest(config.client));
});

/* 
* NOTE: Seperated from wiredep to speed dependencies build on styles,
*		 as compiling the styles could be very slow, this would 
*		 keep the normal running fast
*/
gulp.task('inject', ['wiredep', 'styles', 'templatecache'], function () {
	'use strict';
	log('Custom config the css');
	return gulp
		.src(config.index)
		.pipe($.inject(gulp.src(config.css)))
		.pipe(gulp.dest(config.client));
});

gulp.task('serve-dev', ['inject'], function () {
	'use strict';
	log('Any changes will rebuild the the node server');
	var isDev = true;
	var port = config.defaultPort;
	var nodeOptions = {
		script: config.nodeServer,
		delayTime: 1,
		env: {
			'PORT' : port,
			'NODE_ENV' : isDev?'dev':'build'
		},
		watch: [config.server] 
	};
	return $.nodemon(nodeOptions)
			.on('restart', function (files){	
				log('nodemon reatarted and the following files changed on restart:\n'+files);
			})
			.on('start',['vet'], function (){	
				log('nodemon started and verified');
			})
			.on('crash', function (){	
				log('nodemon crashed');
			})
			.on('exit', function (){	
				log('nodemon exited');
			});
});

gulp.task('help', $.taskListing);

gulp.task('default', ['help']);

gulp.task('fonts', ['clean-fonts'], function () {
	'use strict';
	log('Copying fonts');
	return gulp.src(config.fonts)
		.pipe(gulp.dest(config.build + 'fonts'));
});

gulp.task('images', ['clean-images'], function () {
	log('Copying and compressing the images');
	return gulp.src(config.images)
		.pipe($.imagemin({optimizationLevel:4}))
		.pipe(gulp.dest(config.build + 'images'));
});

gulp.task('bump', function () {
	var message = 'Bumping versions';
	var type = args.type;
	var version = args.version;
	var options = {};
	if(version){
		options.version = version;
		message += ' to ' + version;
	} else {
		options.type = type;
		message += ' for a ' + type;
	}
	log(message);
	return gulp
		.src(config.packages)
		.pipe($.bump(options))
		.pipe($.print())
		.pipe(gulp.dest(config.root));
});

gulp.task('utest',['vet','templatecache'], function (done) {
	startTests(true, done);
});

gulp.task('autoutest',['vet','templatecache'], function (done) {
	startTests(false, done);
});

gulp.task('build-specs', ['vet','templatecache'], function (){
	log('Building the spec runner');
	var wiredep = require('wiredep').stream;
	var options = config.getWiredepDefaultOptions();
	var specs = config.specs;
	options.devDependencies = true; 	
	if(args.startServers){
		specs = [].concat(specs, config.serverIntegrationSpecs);
	}
	
	return gulp
		.src(config.specRunner)
		.pipe(wiredep(options))
		.pipe($.inject(gulp.src(config.testlibraries, { read: false }),{ name:'inject:testlibraries' }))
		.pipe($.inject(gulp.src(config.js)))
		.pipe($.inject(gulp.src(config.specHelpers, { read: false }),{ name:'inject:spechelpers'}))
		.pipe($.inject(gulp.src(specs, { read: false }),{ name:'inject:specs' }))
	    .pipe($.inject(gulp.src(config.temp + config.templateCache.file, { read: false } ),{ name:'inject:templates' }))
		.pipe(gulp.dest(config.client));			
});

gulp.task('serve-specs', ['build-specs','serve-dev']);

/********************************************************/
/*				Utility Functions						*/
/********************************************************/

function errorLogger(error){
	log($.util.colors.red(error));
	this.emit('end');
}

function clean(path, cb){
	log('Cleaning files '+$.util.colors.green(path));
	return del(path, cb);
}

function log(message){
	if(message){
		if(typeof(message) === 'object'){
			for(var item in message){
				if(message.hasOwnProperty(item)){
					$.util.log($.util.colors.blue(message[item]));			
				}
			}
		}
		else{
			$.util.log($.util.colors.blue(message));	
		}		
	}	
}

function startTests(isSingleRun, cb){	
	//server side testing
	var child;
	var fork = require('child_process').fork;
	//end server side testing
	var karma = require('karma').server;
	//log($.util.colors.green('DEBUG: Karma starting \n'+JSON.stringify(config)));
	var excludeFiles = [];
	var serverspecs = config.serverIntegrationSpecs;
	
	//e.g. gulp utest --startServers
	if(args.startServers){ 
		log('starting server');		
		var savedEnv = process.env;
		savedEnv.NODE_ENV ='dev';
		savedEnv.PORT = 8888;
		child = fork(config.nodeServer);
	}
	else{
		if(serverspecs && serverspecs.length){
			excludeFiles = serverspecs;		
		}		
	}
		
	karma.start({
		configFile: __dirname+'/karma.conf.js',
		exclude: excludeFiles,
		singleRun: !!isSingleRun
	}, karmaCompleted);
	
	function karmaCompleted(karmaResult){
		log('Karma Completed');
		if(child){
			log('Shutting down the child process');
			child.kill();
		}
		if(karmaResult === 1){
			cb('karma: tests failed with code ' + karmaResult);
		} else {
			cb();
		}
	}
}