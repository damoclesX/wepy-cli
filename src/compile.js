import path from 'path';
import chokidar from 'chokidar';

import cache from './cache';
import util from './util';
import cWpy from './compile-wpy';
import cWxml from './compile-wxml';
import cLess from './compile-less';
import cJS from './compile-js';


let watchReady = false;
let preventDup = {};


export default {
    findParents (file) {
        //import Counter from '../components/counter';
        let src = cache.getSrc();
        let files = util.getFiles(src);

        let parents = [];

        files = files.filter((v) => /\.(wpy|js)$/.test(v));

        files.forEach((f) => {
            let opath = path.parse(path.join(util.currentDir, src, f));
            let content = util.readFile(opath);

            content.replace(/import\s*([{\w\d-_}]*)\s*from\s*['"](.*)['"]/ig, (match, name, importpath) => {
                if (!/\.wpy$/.test(importpath))
                    importpath = importpath + '.wpy';
                
                if (path.join(opath.dir, importpath) === path.join(util.currentDir, src, file)) {
                    if (!/\.wpy$/.test(f)) {
                        parents = parents.concat(this.findReference(f));
                    } else {
                        // 组件的父组件无需更新，只有父页面需要更新
                        if (f.indexOf('components') !== -1) { // 如果是父组件，继续查找父组件的父页面。
                            parents = parents.concat(this.findParents(f));
                        } else
                            parents.push(f);
                    }
                }
            });
        });
        return util.unique(parents).filter((v) => v.indexOf('components') === -1);
    },
    findReference (file) {
        let src = cache.getSrc();
        let files = util.getFiles(src);

        let refs = [];

        files = files.filter((v) => /\.wpy$/.test(v));

        files.forEach((f) => {
            let opath = path.parse(path.join(util.currentDir, src, f));
            let content = util.readFile(opath);

            content.replace(/<(script|template|style)\s.*src\s*=\s*['"](.*)['"]/ig, (match, tag, srcpath) => {
                if (path.join(opath.dir, srcpath) === path.join(util.currentDir, src, file)) {
                    refs.push(f);
                }
            });
        });

        return refs;
    },
    watch (config) {
        config.watch = false;

        let wepyrc = util.getConfig();
        let src = config.source || wepyrc.src || 'src';
        let dist = config.output || wepyrc.output || 'dist';



        chokidar.watch(`.${path.sep}${src}`, {
            depth: 99
        }).on('all', (evt, filepath) => {
            if ((evt === 'change' || evt === 'add') && watchReady && !preventDup[filepath]) {
                preventDup[filepath] = evt;
                config.file = path.join('..', filepath);
                util.log('文件: ' + filepath, '变更');
                this.build(config);
                setTimeout(() => {
                    preventDup[filepath] = false;
                }, 500);
            }
        }).on('ready', () => {
            watchReady = true;   
            util.log('开始监听文件改动。', '信息');
        });
    },
    build (config) {
          
        let wepyrc = util.getConfig();
        if (!wepyrc) {
            util.error('没有检测到.wepyrc文件, 请执行`wepy new demo`创建');
            return;
        }
        let src = config.source || wepyrc.src || 'src';
        let dist = config.output || wepyrc.output || 'dist';

        let file = config.file;

        let current = process.cwd();
        let files = file ? [file] : util.getFiles(src);


        cache.setSrc(src);
        cache.setDist(dist);

        if (file) { // 指定文件编译时
            if (file.indexOf('.wpy') === -1) { // 是wpy文件，则直接编译，否则检查引用源
                let refs = this.findReference(file);
                if (refs.length === 0) { // 无引用源时，编译当前文件，否则编译引用源。
                    files = [file];
                } else {
                    files = refs;
                }
            } else if (file.indexOf('components') !== -1) { // 是wpy 文件，而且是组件
                let parents = this.findParents(file);
                files = parents.concat([file]);
            }
        }

        if (files.some((v) => v === 'app.wpy')) { // 如果编译文件包含app.wpy，且第一个不是 app.wpy
            if (util.isFile(path.join(current, src, 'app.wpy'))) { // src/app.wpy 存在, 则把它放在第一位, 因为后面需要取页面路径
                let newFiles = ['app.wpy'].concat(files.filter(v => v !== 'app.wpy'));
                files = newFiles;
            } else {
                util.error('根目录不存在app.wpy');
            }
        }
        files.forEach((f) => {
            let opath = path.parse(path.join(current, src, f));
            if (file) {
                this.compile(opath);
            } else { // 不指定文件编译时，跳过引用文件编译
                let refs = this.findReference(f);
                if (!refs.length)
                    this.compile(opath);
            }
        });

        // 缓存文件修改时间戳
        cache.saveBuildCache();

        if (config.watch) {
            this.watch(config);
        }
    },
    compile(opath) {
        let src = cache.getSrc();
        let dist = cache.getDist();

        if (!util.isFile(opath)) {
            util.error('文件不存在：' + getRelative(opath));
            return;
        }
        
        try {
            switch(opath.ext) {
                case '.wpy':
                    cWpy.compile(opath);
                    break;
                case '.less':
                    cLess.compile(opath);
                    break;
                case '.js':
                    cJS.compile(null, 'js', opath);
                    break;
                default:
                    util.log('文件: ' + path.relative(process.cwd(), path.join(opath.dir, opath.base)), '拷贝');
                    util.copy(opath);
            }

        } catch (e) {
            util.log(e, '错误');
            console.log(e);
        }
    }
}