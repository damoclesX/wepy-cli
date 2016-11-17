import util from './util';
import cache from './cache';


export default {
    compile (config, opath) {
        let src = cache.getSrc();
        let dist = cache.getDist();
        let target = util.getDistPath(opath, 'json', src, dist);
        util.log('配置: ' + target, '写入');
        util.writeFile(target, JSON.stringify(config));
    }
}