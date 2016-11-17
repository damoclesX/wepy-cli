import path from 'path';
import chokidar from 'chokidar';

import cache from './cache';
import util from './util';
import cWpp from './compile-wpp';
import cWxml from './compile-wxml';
import cJS from './compile-js';


export default {
    watch (config) {
        config.watch = false;

        let wepyrc = util.getConfig();
        let src = config.source || wepyrc.src || 'src';
        let dist = config.output || wepyrc.output || 'dist';

        chokidar.watch(`.${path.sep}${src}`, {
            depth: 99
        }).on('all', (evt, filepath) => {
            if (evt === 'change') {

                config.file = path.join('..', filepath);
                debugger;
                this.build(config);
            }
        });
    },
    build (config) {
          
        let wepyrc = util.getConfig();
        let src = config.source || wepyrc.src || 'src';
        let dist = config.output || wepyrc.output || 'dist';

        let file = config.file;

        let current = process.cwd();
        let files = file ? [file] : util.getFiles('src');

        if (!config) {
            throw '无效配置文件.wepyrc';
        }

        cache.setSrc(src);
        cache.setDist(dist);

        if (files.length > 1 && files[0] !== 'app.wpp') { // 如果第一个不是 app.wpp
            if (util.isFile(path.join(current, src, 'app.wpp'))) { // src/app.wpp 存在, 则把它放在第一位, 因为后面需要取页面路径
                let newFiles = ['app.wpp'].concat(files.filter(v => v !== 'app.wpp'));
                files = newFiles;
            } else {
                util.error('根目录不存在app.wpp');
            }
        }
        files.forEach((file) => {
            let opath = path.parse(path.join(current, src, file));
            if (opath.ext === '.wpp') {
                try {
                    cWpp.compile(opath);
                } catch (e) {
                    util.log(e, '错误')
                }
            }
        });

        if (config.watch) {
            this.watch(config);
        }
    }
}