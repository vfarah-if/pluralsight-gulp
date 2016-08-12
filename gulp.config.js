module.exports = function(){
	var clientPath = './src/client/';
	var serverPath = './src/server/';
	var clientAppPath = clientPath+'app/';
	var tempPath = './.tmp/';
	var fontsPath = './bower_components/font-awesome/fonts/**/*.*';
	var clientImagesPath = clientPath+'images/**/*.*';
	var rootPath = './';
	var reportPath = './report/';
	var wiredep = require('wiredep');
	var bowerfiles = wiredep({devDependencies: true})['js'];
	var specRunnerFile = 'specs.html';
	
	var config = {	
		// All the js to vet
		alljs : [
		'./src/**/*.js',
		'./*.js'],
		
		// Build
		build: './build/', 
		
		//Expose Client
		client: clientPath,
		
		//Custom CSS
		css: tempPath+'styles.css',
		
		//Html templates
		htmltemplates: clientAppPath+'**/*.html',
		
		//Index page
		index: clientPath+'index.html',
		
		//Fonts
		fonts: fontsPath,
		
		//Images
		images: [clientImagesPath],
		
		//Java script paths and not test files or spec files		
		js:[
			clientAppPath+'**/*.module.js',
			clientAppPath+'**/*.js',
			'!'+clientAppPath+'**/*.spec.js', 
		   ],
		
		//Less styles
		less: clientPath+'styles/styles.less',
		
		// Expose Server
		server: serverPath,
		
		//Spec runner or specs.html
		specRunnerFile: specRunnerFile,
		specRunner: clientPath + specRunnerFile,
		testlibraries: [
			'node_modules/mocha/mocha.js',
			'node_modules/chai/chai.js',
			'node_modules/mocha-clean/index.js',
			'node_modules/sinon-chai/lib/sinon-chai.js',
		],
		specs: [clientPath + '**/*.spec.js'],
		
		// Karma and Testing Settings
		specHelpers: [clientPath + 'test-helpers/*.js'],
		serverIntegrationSpecs: [
			clientPath+'tests/server-integration/**/*.spec.js',			
		],
		
		// Temporary folder
		temp: tempPath,		
		
		// Template cache
		templateCache: {
			file: 'templates.js',
			options: {
				module: 'app.core',
				standAlone: false,
				root: 'app/'
			}
		},
	
		//Bower and NPM locations
		bower: {
			json: require('./bower.json'),
			directory: './bower_components/',
			ignorePath: '../..'
		},
		
		//Bumping configuration for versioning
		packages: [
			'./package.json',
			'./bower.json'
		],
		
		root: rootPath,
		
		// Node settings
		defaultPort: 7203,
		nodeServer: serverPath+'app.js'
	};
	
	config.getWiredepDefaultOptions = function(){
		var options = {
			bowerJson: config.bower.json,
			directory: config.bower.directory,
			ignorePath: config.bower.ignorePath
		};
		return options;
	};
	
	config.karma = getKarmaOptions();
	
	return config;
	
	/********************************************************/
	/*				Utility Functions						*/
	/********************************************************/
	
	function getKarmaOptions() {		
		var options = {
			files: [].concat(
				bowerfiles,
				config.specHelpers,
				clientPath + '**/*.module.js',
				clientPath + '**/*.js',
				tempPath + config.templateCache.file,
				config.serverIntegrationSpecs
			),
			exclude: [],
			coverage: {
				dir: reportPath+'coverage',
				reporters: [
					{ type: 'html', subdir:'report-html' },
					{ type: 'lcov', subdir:'report-lcov' },
					{ type: 'text-summary' },
				]
			},
			preprocessors: {}
		};
		//Exclude code coverage on test files
		options.preprocessors[clientPath+'**/!(*.spec)+(.js)'] = ['coverage']; 
		return options;
	}	
};