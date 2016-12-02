import path from 'path';
import imagemin from 'imagemin';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import util from './../util';
import fs from 'fs';


export default class {

    constructor(config) {
        this.config = config || {};
    }
    apply (op) {
        util.output('压缩', op.file);

        /*optimage({
            inputFile: op.file,
            outputFile: op.file + '.min.png'
        }, (err, res) => {
            debugger;
        });*/

        imagemin([op.file], '', {
            plugins: [
                imageminMozjpeg(),
                imageminPngquant({quality: '65-80'})
            ]
        }).then((files) => {
            fs.writeFile(op.file, files[0].data, function () {});
        }).catch((e) => {
        });
        op.next(op);
    }
}