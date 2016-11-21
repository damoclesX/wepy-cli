import {DOMParser, DOMImplementation} from 'xmldom';
import path from 'path';
import util from './util';
import cache from './cache';

const PREFIX = '$';
const JOIN = '$';

export default {
    comPrefix: {},
    comCount: 0,
    getPrefix (prefix) {
        return prefix;
        if (this.comPrefix[prefix])
            return this.comPrefix[prefix];
        this.comPrefix[prefix] = this.comCount++;
        return this.comPrefix[prefix];
    },
    getTemplate (src) {
        let content = util.readFile(src);
        if (content === null) {
            throw '打开文件失败: ' + content;
        }
        let doc = new DOMImplementation().createDocument();
        let node = (util.isString(src) ? new DOMParser().parseFromString(content) : src);
        let template = [].slice.call(node.childNodes || []).filter((n) => n.nodeName === 'template');
        if (!template.length)
            throw 'Can not find template from ' + src;

        [].slice.call(template[0].childNodes || []).forEach((n) => {
            doc.appendChild(n);
        });
        return doc;
    },

    isInQuote (str, n) {
        let firstIndex = str.search(/"|'/);
        if (firstIndex === -1 || firstIndex > n) return false;
        let char = '';
        let last = '';
        for (let i = 0; i < n; i++) {
            let c = str[i];
            if (c === '"' || c === "'") {
                if (!char) {
                    char = c;
                } else if (char === c && last !== '\\') {
                    char = '';
                }
            }
            last = c;
        }
        return char !== '';
    },

    parseExp (content, prefix, ignores) {
        let comid = this.getPrefix(prefix);
        // replace {{ param ? 'abc' : 'efg' }} => {{ $prefix_param ? 'abc' : 'efg' }}
        return content.replace(/\{\{([^}]+)\}\}/ig, (matchs, words) => {
            return matchs.replace(/[^\.\w'"]([a-z_\$][\w\d\._\$]*)/ig, (match, word, n) => {
                //console.log(matchs + '------' + match + '--' + word + '--' + n);
                let char = match[0];
                let w = word.match(/^\w+/)[0];
                if (ignores[w] || this.isInQuote(matchs, n)) {
                    return match;
                } else {
                    return `${char}${PREFIX}${comid}${JOIN}${word}`;
                }
            });
        });
    },


    updateBind (node, prefix, ignores = {}) {

        let comid = this.getPrefix(prefix);

        if (node.nodeName === '#text') {
            if (node.data && node.data.indexOf('{{') > -1) {
                node.replaceData(0, node.data.length, this.parseExp(node.data, prefix, ignores));
            }
        } else {
            [].slice.call(node.attributes || []).forEach((attr) => {
                if (attr.value.indexOf('{{') > -1) {
                    attr.value = this.parseExp(attr.value, prefix, ignores);
                }
                if (attr.name === 'wx:for' || attr.name === 'wx:for-items') {
                    let index = node.getAttribute('wx:for-index') || 'index';
                    let item = node.getAttribute('wx:for-item') || 'item';
                    ignores[index] = true;
                    ignores[item] = true;
                    //attr.value = parseExp(attr.value, prefix, ignores);
                }
                // bindtap="abc" => bindtap="prefix_abc"
                if (attr.name.indexOf('bind') === 0 || attr.name.indexOf('catch') === 0) {
                    attr.value = `${PREFIX}${comid}${JOIN}` + attr.value;
                }
            });
            [].slice.call(node.childNodes || []).forEach((child) => {
                this.updateBind(child, prefix, ignores);
            });
        }
        return node;
    },

    compileXML (node, prefix) {
        if (prefix) {
            this.updateBind(node, prefix);
        }

        let componentElements = node.getElementsByTagName('component');
        for (let i = 0, len = componentElements.$$length; i < len; i++) {
            let com = componentElements[i];
            let comid = com.getAttribute('id');
            let definePath = com.getAttribute('path');
            if (comid && !definePath)
                definePath = comid;
            if (!comid && definePath)
                definePath = comid;
            if (!comid)
                throw new Error('Unknow component id');

            let src = util.findComponent(definePath);

            //this.comPrefix[prefix ? `${prefix}$${comid}` : `$${comid}`] = this.comCount++;
            //this.getPrefix(prefix ? `${prefix}$${comid}` : `$${comid}`);

            node.replaceChild(this.compileXML(this.getTemplate(src), prefix ? `${prefix}$${comid}` : `${comid}`), com);
        };
        return node;
    },

    compile (content, opath) {
        let src = cache.getSrc();
        let dist = cache.getDist();
        let node = new DOMParser().parseFromString(content);
        node = this.compileXML(node);
        let target = util.getDistPath(opath, 'wxml', src, dist);
        util.log('WXML: ' + path.relative(process.cwd(), target), '写入');
        util.writeFile(target, util.decode(node.toString()));
    }
}