import {transform} from 'babel-core';
import path from 'path';
import util from './util';
import cache from './cache';


const currentPath = util.currentDir;
const src = cache.getSrc();
const dist = cache.getDist();
const modulesPath = path.join(currentPath, 'node_modules' + path.sep);
const npmPath = path.join(currentPath, dist, 'npm' + path.sep);

export default {

    getPkgConfig (lib) {
        let pkg = util.readFile(path.join(modulesPath, lib, 'package.json'));
        try {
            pkg = JSON.parse(pkg);
        } catch (e) {
            pkg = null;
        }
        return pkg;
    },

    resolveDeps (code, type, opath) {



        return code.replace(/require\(['"]([\w\d_\-\.\/]+)['"]\)/ig, (match, lib) => {

            let resolved = lib;

            let target = '', source = '', ext = '', needCopy = false;

            if (lib[0] === '.') { // require('./something'');
                source = path.join(opath.dir, lib);  // e:/src/util
                if (type === 'npm') {
                    target = path.join(npmPath, path.relative(modulesPath, source));
                    needCopy = true;
                } else {
                    target = source.replace(path.sep + 'src' + path.sep, path.sep + 'dist' + path.sep);   // e:/dist/util
                    needCopy = false;
                }
            } else if (lib.indexOf('/') === -1 || lib.indexOf('/') === lib.length - 1) {  //        require('asset');
                let pkg = this.getPkgConfig(lib);
                if (!pkg) {
                    throw Error('找不到模块: ' + lib);
                }
                let main = pkg.main || 'index.js';
                if (pkg.browser && typeof pkg.browser === 'string') {
                    main = pkg.browser;
                }
                source = path.join(modulesPath, lib, main);
                target = path.join(npmPath, lib, main);
                lib += path.sep + main;
                ext = '';
                needCopy = true;
            } else { // require('babel-runtime/regenerator')
                //console.log('3: ' + lib);
                source = path.join(modulesPath, lib);
                target = path.join(npmPath, lib);
                ext = '';
                needCopy = true;
            }

            if (util.isFile(source + '.wpp')) {
                ext = '.js';
            } else if (util.isFile(source + '.js')) {
                ext = '.js';
            } else if (util.isDir(source) && util.isFile(source + path.sep + 'index.js')) {
                ext = path.sep + 'index.js';
            }else if (util.isFile(source)) {
                ext = '';
            } else {
                throw ('找不到文件: ' + source);
            }
            source += ext;
            target += ext;
            lib += ext;
            resolved = lib;

            if (needCopy) {
                if (!cache.checkBuildCache(source)) {
                    cache.setBuildCache(source);
                    util.log('依赖: ' + path.relative(process.cwd(), target), '拷贝');
                    /*let dirname = path.dirname(target);
                    mkdirp.sync(dirname);*/

                    this.compile(null, 'npm', path.parse(source));

                }
                /*if (!buildCache[source] || buildCache[source] !== getModifiedTime(source)) {
                    buildCache[source] = getModifiedTime(source);
                    console.log('copying........' + target + ' ===== ' + source);
                    let dirname = path.dirname(target);
                    buildCache[source] = getModifiedTime(source);
                    mkdirp.sync(dirname);
                    gulp.src(source).pipe(change(compileJS)).pipe(gulp.dest(dirname));
                }*/
            }
            if (lib.indexOf('regenerator-runtime') > 1)
                debugger;
            if (type === 'npm') {
                if (lib[0] !== '.') {
                    resolved = path.join('..' + path.sep, path.relative(opath.dir, modulesPath), lib);
                } else {
                    if (lib[0] === '.' && lib[1] === '.')   
                        resolved = './' + resolved;
                }
            } else {
                resolved = path.relative(util.getDistPath(opath, opath.ext, src, dist), target);
            }
            resolved = resolved.replace(/\\/g, '/').replace(/^\.\.\//, './');
            return `require('${resolved}')`;
        });
    },

    compile (code, type, opath) {
        let config = util.getConfig();
        if (!code) {
            code = util.readFile(path.join(opath.dir, opath.base));
            if (code === null) {
                throw '打开文件失败: ' + path.join(opath.dir, opath.base);
            }
        }
        if (type !== 'npm') {
            code = transform(code, config.babel).code;

            if (type === 'page' || type === 'app') {
                let defaultExport = 'exports.default';
                let matchs = code.match(/exports\.default\s*=\s*(\w+);/i);
                if (matchs) {
                    defaultExport = matchs[1];
                    code = code.replace(/exports\.default\s*=\s*(\w+);/i, '');

                    if (type === 'page') {
                        code += `\nPage(require('wepy').default.$createPage(${defaultExport}));\n`;
                    } else {
                        code += `\nApp(require('wepy').default.$createApp(${defaultExport}));\n`;
                    }
                }
            }
        }
        code = this.resolveDeps(code, type, opath);

        if (type !== 'npm') {
            let target = util.getDistPath(opath, 'js', src, dist);
            util.log('JS  : ' + path.relative(process.cwd(), target), '写入');
            util.writeFile(target, code);
        } else {
            let target = path.join(npmPath, path.relative(modulesPath, path.join(opath.dir, opath.base)));
            util.log('JS  : ' + path.relative(process.cwd(), target), '写入');
            util.writeFile(target, code);
        }

    }

}
