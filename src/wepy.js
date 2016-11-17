import commander from 'commander';
import path from 'path';
import util from './util';
import compile from './compile';



let displayVersion = () => {
    let version = util.getVersion();
    let chars = [
        '   _    _  ____  ____  _  _ ',
        '( \/\/ )( ___)(  _ \( \/ )',
        ' )    (  )__)  )___/ \  / ',
        '(__/\__)(____)(__)   (__) ',
        '                                         '                                       
    ].join('\n');
    console.log('\n v' + version + '\n');
    console.log(chars);
};


commander.usage('[command] <options ...>');
commander.option('-v, --version', 'output the version number', () => {
  displayVersion();
});
commander.option('-V', 'output the version number', () => {
  displayVersion();
});
commander.option('--es5', 'use es5 for project, used in `new` command');
commander.option('-s, --source <source>', '源码目录');
commander.option('-t, --target <target>', '生成代码目录');
commander.option('-f, --file <file>', '待编译wpp文件');
commander.option('-r, --rest', 'create rest controller, used in `controller` command');
commander.option('-M, --mongo', 'create mongo model, used in `model` command');
commander.option('-R, --relation', 'create relation model, used in `model` command');
commander.option('-m, --mode <mode>', 'project mode type(normal, module), default is module, used in `new` command', mode => {
  if(modeList.indexOf(mode) === -1){
    console.log('mode value must one of ' + modeList.join(', '));
    process.exit();
  }
  think.mode = think['mode_' + mode];
});

// Build
commander.command('build').description('create project').action(projectPath => {
    compile.build(commander.source, commander.target);
});

//create module
commander.command('module <moduleName>').description('add module').action(module => {
  createModule(module.toLowerCase());
});

//create controlelr
commander.command('controller <controllerName>').description('add controller').action(controller => {
  createController(controller.toLowerCase());
});

//create service
commander.command('service <serviceName>').description('add service').action(service => {
  createService(service.toLowerCase());
});

//create model
commander.command('model <modelName>').description('add model').action(model => {
  createModel(model.toLowerCase());
});

//create middleware
commander.command('middleware <middlewareName>').description('add middleware').action(middleware => {
  createMiddleware(middleware.toLowerCase());
});

//create adapter
commander.command('adapter <adapterName>').description('add adapter').action(adapter => {
  createAdapter(adapter.toLowerCase());
});

//create plugin
commander.command('plugin <pluginPath>').description('create ThinkJS plugin').action(pluginPath => {
  projectRootPath = path.resolve(projectRootPath, pluginPath);
  
  createPlugin();
});

commander.parse(process.argv);  