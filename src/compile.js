import path from 'path';
import chokidar from 'chokidar';

import cache from './cache';
import util from './util';
import cWpy from './compile-wpy';
import cWxml from './compile-wxml';
import cLess from './compile-less';
import cSass from './compile-sass';
import cJS from './compile-js';

import loader from './plugins/loader';


let watchReady = false;
let preventDup = {};


export default {
    /**
     * find parent, import xxxx from xxx;
     */
    findParents (file) {
        //import Counter from '../components/counter';
        let src = cache.getSrc();
        let files = util.getFiles(src);
        let ext = cache.getExt();

        let parents = [];

        let reg = new RegExp('\\.(' + ext.substr(1) + '|js)$');

        files = files.filter((v) => reg.test(v));

        files.forEach((f) => {
            let opath = path.parse(path.join(util.currentDir, src, f));
            let content = util.readFile(opath);

            content && content.replace(/import\s*([{\w\d-_}]*)\s*from\s*['"](.*)['"]/ig, (match, name, importpath) => {
                reg = new RegExp('\\' + ext + '$');
                if (!reg.test(importpath))
                    importpath = importpath + ext;
                
                if (path.join(opath.dir, importpath) === path.join(util.currentDir, src, file)) {
                    if (!reg.test(f)) {
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
    /**
     * find src, <script src="">
     */
    findReference (file) {
        let src = cache.getSrc();
        let files = util.getFiles(src);
        let ext = cache.getExt();

        let refs = [];

        let reg = new RegExp('\\' + ext + '$');

        files = files.filter((v) => reg.test(v));

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
        config.noCache = config.rawArgs.indexOf('--no-cache') !== -1;

        if (config.noCache) {
            cache.clearBuildCache();
        }

        let src = config.source || wepyrc.src || 'src';
        let dist = config.output || wepyrc.output || 'dist';
        let ext = config.wpyExt || wepyrc.wpyExt || '.wpy';

        config.source = src;
        config.dist = dist;
        config.wpyExt = ext;

        if (ext.indexOf('.') === -1)
            ext = '.' + ext;

        let file = config.file;

        let current = process.cwd();
        let files = file ? [file] : util.getFiles(src);

        cache.setParams(config);
        cache.setSrc(src);
        cache.setDist(dist);
        cache.setExt(ext);

        if (file) { // 指定文件编译时
            if (file.indexOf(ext) === -1) { // 是wpy文件，则直接编译，否则检查引用源
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

        if (files.some((v) => v === 'app' + ext)) { // 如果编译文件包含app.wpy，且第一个不是 app.wpy
            if (util.isFile(path.join(current, src, 'app' + ext))) { // src/app.wpy 存在, 则把它放在第一位, 因为后面需要取页面路径
                let newFiles = ['app' + ext].concat(files.filter(v => v !== 'app' + ext));
                files = newFiles;
            } else {
                util.error('根目录不存在app' + ext);
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
        let ext = cache.getExt();
        let config = util.getConfig();

        if (!util.isFile(opath)) {
            util.error('文件不存在：' + getRelative(opath));
            return;
        }
        
        try {
            switch(opath.ext) {
                case ext:
                    cWpy.compile(opath);
                    break;
                case '.less':
                    cLess.compile(opath);
                    break;
                case '.sass':
                case '.scss':
                    cSass.compile(opath);
                    break;
                case '.js':
                    cJS.compile(null, 'js', opath);
                    break;
                default:
                    util.output('拷贝', path.join(opath.dir, opath.base));
                    //util.copy(opath);

                    let plg = new loader(config.plugins, {
                        type: opath.ext.substr(1),
                        code: null,
                        file: path.join(opath.dir, opath.base),
                        done (rst) {
                            if (rst.code) {
                                let target = util.getDistPath(path.parse(rst.file));
                                util.writeFile(target, rst.code);
                            } else {
                                util.copy(path.parse(rst.file));
                            }
                        },
                        error (rst) {
                            util.warning(rst.err);
                            util.copy(path.parse(rst.file));
                        }
                    });
            }

        } catch (e) {
            util.log(e, '错误');
        }
    }
}