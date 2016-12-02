import path from 'path';
import util from './../util';


export default class {

    constructor(config) {
        this.config = config || {};
    }
    apply (op) {
        util.output('测试', op.file);
        op.code = op.code + '/*test*/';
        op.next(op);
    }
}