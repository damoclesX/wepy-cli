import path from 'path';
import uglify from 'uglify-js';
import util from './../util';


export default class {

    constructor(config) {
        this.config = config || {};
    }
    apply (op) {
        util.output('压缩', op.file);
        this.config.fromString = true;
        let rst = uglify.minify(op.code, this.config);
        let k;
        for (k in rst)
            op[k] = rst[k];
        op.next(op);
    }
}