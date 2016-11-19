import less from 'less';
import path from 'path';

import util from './util';
import cache from './cache';

export default {
    compile (content, requires, opath) {
        let src = cache.getSrc();
        let dist = cache.getDist();

        less.render(content || '/* empty */', {}).then((res) => {
            if (requires && requires.length) {
                requires.forEach((r) => {
                    let comsrc = util.findComponent(r);
                    let relative = path.relative(opath.dir + path.sep + opath.base, comsrc);
                    relative = relative.replace('.wpy', '.wxss').replace(/\\/ig, '/').replace('../', './');
                    res.css = '@import "' + relative + '";\n' + res.css;
                });
            }
            let target = util.getDistPath(opath, 'wxss', src, dist);
            util.log('LESS: ' + path.relative(process.cwd(), target), '写入');
            util.writeFile(target, res.css);
        }).catch((e) => {
            util.error(e);
        });

    }
}