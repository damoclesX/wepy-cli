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
commander.option('-w, --watch', '监听文件改动');
/*
commander.option('-m, --mode <mode>', 'project mode type(normal, module), default is module, used in `new` command', mode => {
  if(modeList.indexOf(mode) === -1){
    console.log('mode value must one of ' + modeList.join(', '));
    process.exit();
  }
  think.mode = think['mode_' + mode];
});*/

commander.command('build').description('create project').action(projectPath => {
    compile.build(commander);
});

commander.command('new <projectName>').description('生成项目').action(module => {
});


commander.command('add <page>').description('添加页面').action(controller => {
});

commander.parse(process.argv);  