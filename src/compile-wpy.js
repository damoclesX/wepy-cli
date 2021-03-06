import path from 'path';
import fs from 'fs';
import {DOMParser} from 'xmldom';
import cache from './cache';
import util from './util';

import cConfig from './compile-config';
import cLess from './compile-less';
import cSass from './compile-sass';
import cCss from './compile-css';
import cWxml from './compile-wxml';
import cJS from './compile-js';

export default {

    grabConfigFromScript(str, n) {
        let stash = [], rst = '';
        for (let i = n, l = str.length; i < l; i++) {
            if (str[i] === '{')
                stash.push('{');
            if (str[i] === '}') {
                stash.pop();
                if (stash.length === 0) {
                    rst += '}';
                    break;
                }
            }
            if (stash.length)
                rst += str[i];
        }
        return rst;
    },
    resolveRelation (xml) {
        let requires = [];
        let matchs = xml.match(/<component[^/>]*\/>/ig);

        (matchs || []).forEach(function (m) {
            let rst;
            if (m.indexOf('path') > -1) {
                rst = m.match(/path\s*=\s*['"](.*)['"]/);
            } else {
                rst = m.match(/id\s*=\s*['"](.*)['"]/);
            }
            if (rst[1] && requires.indexOf(rst[1]) === -1)
                requires.push(rst[1]);
        });
        return requires;
    },

    resolveWpy (xml, opath) {

        let rst = {style: {code: ''}, template: {code: ''}, script: {code: ''}};

        [].slice.call(xml.childNodes || []).forEach((child) => {
            if (child.nodeName === 'style' || child.nodeName === 'template' || child.nodeName === 'script') {
                rst[child.nodeName].src = child.getAttribute('src');
                rst[child.nodeName].type = child.getAttribute('lang') || child.getAttribute('type');

                if (rst[child.nodeName].src) {
                    rst[child.nodeName].src = path.resolve(opath.dir, rst[child.nodeName].src);
                }

                if (rst[child.nodeName].src && util.isFile(rst[child.nodeName].src)) {
                    rst[child.nodeName].code = util.readFile(rst[child.nodeName].src, 'utf-8');
                    if (rst[child.nodeName].code === null) {
                        throw '打开文件失败: ' + rst[child.nodeName].src;
                    }
                } else {
                    [].slice.call(child.childNodes || []).forEach((c) => {
                        rst[child.nodeName].code += util.decode(c.toString());
                    });
                }

                if (!rst[child.nodeName].src)
                    rst[child.nodeName].src = path.join(opath.dir, opath.name + opath.ext);
            }
        });

        if (rst.template.code) {
            rst.template.requires = this.resolveRelation(rst.template.code);
        }

        // default type
        rst.style.type = rst.style.type || 'css';
        rst.template.type = rst.template.type || 'wxml';
        rst.script.type = rst.script.type || 'js';

        let match = rst.script.code.match(/[\s\r\n]config\s*=[\s\r\n]*/);
        match = match ? match[0] : undefined;

        rst.config = match ? this.grabConfigFromScript(rst.script.code, rst.script.code.indexOf(match) + match.length) : false;
        if (rst.config)
            rst.config = JSON.parse(rst.config);

        return rst;
    },

    remove (opath, ext) {
        let src = cache.getSrc();
        let dist = cache.getDist();
        ext = ext || opath.substr(1);
        let target = util.getDistPath(opath, ext, src, dist);
        if (util.isFile(target)) {
            util.log('配置: ' + path.relative(util.currentDir, target), '删除');
            fs.unlinkSync(target);
        }
    },

    compile (opath) {
        let filepath = path.join(opath.dir, opath.base);
        let src = cache.getSrc();
        let dist = cache.getDist();
        let wpyExt = cache.getExt();
        let pages = cache.getPages();
        let content = util.readFile(filepath);
        if (content === null) {
            throw new Error('打开文件失败: ' + filepath);
            return;
        }
        let startlen = content.indexOf('<script') + 7;
        while(content[startlen++] !== '>') {
            // do nothing;
        }
        content = util.encode(content, startlen, content.indexOf('</script>') - 1);
        let doc = new DOMParser().parseFromString(content);

        let type = '';

        let rst = {style: {code: ''}, template: {code: ''}, script: {code: ''}};

        let relative = path.relative(util.currentDir, filepath);

        if (filepath === path.join(util.currentDir, src, 'app' + wpyExt)) {
            type = 'app';
            util.log('入口: ' + relative, '编译');
        } else if (pages.indexOf(relative) > -1) {
            type = 'page';
            util.log('页面: ' + relative, '编译');
        } else if (relative.indexOf(path.sep + 'components' + path.sep) > -1){
            type = 'component';
            util.log('组件: ' + relative, '编译');
        } else {
            util.log('Other: ' + relative, '编译');
        }

        let wpy = this.resolveWpy(doc, opath);

        if (type === 'app') { // 第一个编译
            cache.setPages(wpy.config.pages.map(v => path.join(src, v + wpyExt)));
        }

        if (wpy.config) {
            cConfig.compile(wpy.config, opath);
        } else {
            this.remove(opath, 'json');
        }

        if (wpy.style.code || wpy.template.requires.length) {
            if (wpy.style.type === 'less') 
                cLess.compile(wpy.style.code, wpy.template.requires, opath);
            if (wpy.style.type === 'sass') 
                cSass.compile(wpy.style.code, wpy.template.requires, opath);
            if (wpy.style.type === 'css')
                cCss.compile(wpy.style.code, wpy.template.requires, opath);
        } else {
            this.remove(opath, 'wxss');
        }

        if (wpy.template.code && (type !== 'app' && type !== 'component')) { // App 和 Component 不编译 wxml
            if (wpy.template.type === 'wxml')
                cWxml.compile(wpy.template.code, opath);
        }

        if (wpy.script.code) {
            cJS.compile(wpy.script.code, type, opath);
        }
    }
}