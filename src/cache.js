import util from './util';

const cachePath = '.wepycache';
let _buildCache = null;

export default {
    getSrc () {
        return this._src || 'src';
    },
    setSrc (v = 'src') {
        this._src = v;
    },
    getDist () {
        return this._dist || 'dist';
    },
    setDist (v = 'dist') {
        this._dist = v;
    },
    setPages (v = []) {
        this._pages = v;
    },
    getPages () {
        return this._pages || [];
    },
    getConfig () {
        return this._config || null;
    },
    setConfig (v = null) {
        this._config = v;
    },
    getBuildCache (file) {
        if (_buildCache)
            return _buildCache;

        if (util.isFile(cachePath)) {
            _buildCache = util.readFile(cachePath);
            try {
                _buildCache = JSON.parse(_buildCache);
            } catch (e) {
                _buildCache = null;
            }
        }

        return _buildCache || {};
    },
    setBuildCache (file) {
        let cache = this.getBuildCache();
        cache[file] = util.getModifiedTime(file);
        _buildCache = cache;
    },
    saveBuildCache() {
        util.writeFile(cachePath, JSON.stringify(_buildCache));
    },
    checkBuildCache(file) {
        let cache = this.getBuildCache();
        return cache[file] && cache[file] === util.getModifiedTime(file);
    }

}