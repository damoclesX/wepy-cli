import path from 'path';

import cache from './cache';
import util from './util';
import cWpp from './compile-wpp';
import cWxml from './compile-wxml';
import cJS from './compile-js';


export default {
    build (src = 'src', dist = 'dist', file = null) {
        let current = process.cwd();
        let files = file ? [file] : util.getFiles('src');

        let config = util.getConfig();
        if (!config) {
            throw '无效配置文件.wepyrc';
        }

        cache.setSrc(src);
        cache.setDist(dist);

        if (files[0] !== 'app.wpp') { // 如果第一个不是 app.wpp
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
                cWpp.compile(opath);
            }
        });
    }
}