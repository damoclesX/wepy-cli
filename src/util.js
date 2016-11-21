import colors from 'colors/safe';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';

import cache from './cache';

colors.enabled = true;

colors.setTheme({
    /*SILLY: 'rainbow',
    INPUT: 'grey',
    VERBOSE: 'cyan',
    PROMPT: 'grey',
    INFO: 'green',
    DATA: 'grey',
    HELP: 'cyan',
    WARN: 'yellow',
    DEBUG: 'blue',
    ERROR: 'red',*/
    '变更': 'bgYellow',
    '删除': 'bgMagenta',
    '执行': 'blue',
    '信息': 'grey',
    '完成': 'green',
    '监听': 'magenta',
    '错误': 'red',
    '拷贝': 'yellow',
    '编译': 'blue',
    '写入': 'green'
});

export default {

    findComponent(com) {
        let comPath = path.join(this.currentDir, cache.getSrc(), 'components', com);
        let src = '';
        if (this.isFile(comPath + '.wpy')) {
            src = comPath + '.wpy';
        } else if (this.isFile(comPath + '/index.wpy')) {
            src = comPath + '/index.wpy';
        } else if (this.isFile(comPath + '/' + com + '.wpy')) {
            src = comPath + '/' + com + '.wpy';
        } else 
            throw new Error('Can not find components ' + comPath);
        return src;
    },

    currentDir: process.cwd(),
    cliDir: __dirname,

    isFunction (fn) {
        return typeof(fn) === 'function';
    },
    isString (obj) {
        return toString.call(obj) === '[object String]';
    },
    isObject (obj) {
        return toString.call(obj) === '[object Object]';
    },
    isNumber (obj) {
        return toString.call(obj) === '[object Number]';
    },
    isBoolean (obj) {
        return toString.call(obj) === '[object Boolean]';
    },
    isArray (obj) {
        return Array.isArray(obj);
    },
    isFile (p) {
        p = (typeof(p) === 'object') ? path.join(p.dir, p.base) : p;
        if (!fs.existsSync(p)) {
            return false;
        }
        return fs.statSync(p).isFile();
    },
    isDir (p) {
        if (!fs.existsSync(p)) {
            return false;
        }
        return fs.statSync(p).isDirectory();
    },
    /**
     * xml dom 对 TEXT_NODE 和 ATTRIBUTE_NODE 进行转义。
     */
    decode (contend) {
        let pmap = ['<', '&', '"'];
        let amap = ['&lt;', '&amp;', '&quot;'];
        let reg = new RegExp(`(${amap[0]}|${amap[1]}|${amap[2]})`, 'ig');
        return contend.replace(reg, (match, m) => {
            return pmap[amap.indexOf(m)];
        });
    },
    unique (arr) {
        let tmp = {}, out = [];
        arr.forEach((v) => {
            if (!tmp[v]) {
                tmp[v] = 1;
                out.push(v);
            }
        });
        return out;
    },
    readFile (p) {
        let rst = '';
        p = (typeof(p) === 'object') ? path.join(p.dir, p.base) : p;
        try {
            rst = fs.readFileSync(p, 'utf-8');
        } catch (e) {
            rst = null;
        }
        return rst;
    },
    writeFile (p, data) {
        let opath = (this.isString(p) ? path.parse(p) : p);
        if (!this.isDir(opath.dir)) {
            mkdirp.sync(opath.dir);
        }
        fs.writeFileSync(p, data);
    },
    copy(opath, ext, src, dist) {
        let target = this.getDistPath(opath, ext, src, dist);
        this.writeFile(target, this.readFile(path.join(path.dir, path.base)));
    },
    getRelative(opath) {
        return path.relative(this.currentDir, path.join(opath.dir, opath.base));
    },
    getDistPath(opath, ext, src, dist) {
        src = src || cache.getSrc();
        dist = dist || cache.getDist();
        ext = (ext ? ('.' + ext) : opath.ext);
        let dir = (opath.dir + path.sep).replace(path.sep + src + path.sep, path.sep + dist + path.sep);
        return dir + opath.name + ext;
    },
    getModifiedTime (p) {
        return this.isFile(p) ? +fs.statSync(p).mtime : false;
    },
    getConfig () {
        let config = cache.getConfig();
        if (config)
            return config;
        config = this.readFile(path.join(process.cwd(), path.sep + '.wepyrc'));
        try {
            config = JSON.parse(config);
        } catch(e) {
            config = null;
        }
        cache.setConfig(config);
        return config;
    },
    getFiles (dir = process.cwd(), prefix = '') {
        let cfiles = cache.getFileList(dir);
        if (cfiles)
            return cfiles;
        dir = path.normalize(dir);
        if (!fs.existsSync(dir)) {
            return [];
        }
        let files = fs.readdirSync(dir);
        let rst = [];
        files.forEach((item) => {
            let filepath = dir + path.sep + item;
            let stat = fs.statSync(filepath);
            if (stat.isFile()) {
                rst.push(prefix + item);
            } else if(stat.isDirectory()){
                rst = rst.concat(this.getFiles(path.normalize(dir + path.sep + item),  path.normalize(prefix + item + path.sep)));
            }
        });

        cache.setFileList(dir, rst);
        return rst;
    },
    getVersion () {
        let filepath = path.resolve(__dirname, '../package.json');
        let version = JSON.parse(this.readFile(filepath)).version;
        return version;
    },
    datetime (date = new Date(), format = 'HH:mm:ss') {
        let fn = (d) => {
            return ('0' + d).slice(-2);
        };
        if (date && this.isString(date)) {
            date = new Date(Date.parse(date));
        }
        const formats = {
            YYYY: date.getFullYear(),
            MM: fn(date.getMonth() + 1),
            DD: fn(date.getDate()),
            HH: fn(date.getHours()),
            mm: fn(date.getMinutes()),
            ss: fn(date.getSeconds())
        };
        return format.replace(/([a-z])\1+/ig, function (a) {
            return formats[a] || a;
        });
    },
    error (msg) {
        this.log(msg, 'error', false);
    },
    log (msg, type, showTime = true) {
        let dateTime = showTime ? colors.gray(`[${this.datetime()}] `) : '';
        if(this.isObject(msg) || this.isArray(msg)){
            msg = JSON.stringify(msg);
        }
        if(type && this.isString(type)) {
            type = type.toUpperCase();
            if(type === 'ERROR'){
                console.error(colors.red('[Error] ' + msg));
                //console.log();
            } else {
                let fn = colors[type] ? colors[type] : colors['info'];
                console.log(dateTime + colors[type](`[${type}]`) + ' ' + msg);
            }
        } else {
            console.log(dateTime + msg); 
        }
    }
}