import path from 'path';

import util from './util';
import cache from './cache';

export default {
    compile (content, requires, opath) {
        let src = cache.getSrc();
        let dist = cache.getDist();

        if (requires && requires.length) {
            requires.forEach((r) => {
                let comsrc = util.findComponent(r);
                let relative = path.relative(opath.dir + path.sep + opath.base, comsrc);
                relative = relative.replace('.wpp', '.wxss').replace(/\\/ig, '/').replace('../', './');
                content = '@import "' + relative + '";\n' + content;
            });
        }
        let target = util.getDistPath(opath, 'wxss', src, dist);
        util.log('CSS: ' + target, '写入');
        util.writeFile(target, content);
    }
}