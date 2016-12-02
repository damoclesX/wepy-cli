

export default class {

    plugins = [];
    index = 0;
    
    constructor(plugins, op) {
        let plg, plgkey, setting, config;
        for (plgkey in plugins) {
            setting = plugins[plgkey];
            config = setting;
            if (setting.filter) {
                config = setting.config;
                
                if (setting.filter.test(op.file)) {
                    try {
                        plg = require('./' + plgkey).default;
                    } catch (e) {
                        throw '未定义插件：' + plgkey;
                    }
                    this.plugins.push(new plg(plugins[plgkey]));
                }
            }
        }
        this.apply(0, op);
    }

    apply(index, op) {
        let plg = this.plugins[index];

        if (!plg) {
            op.done && op.done(op);
        } else {
            op.next = (op) => {
                this.apply(index + 1, op);
            }
            if (plg)
                plg.apply(op);

        }

    }
}