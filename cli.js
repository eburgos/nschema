import * as minimist from "minimist";
import * as path from "path";
import { features, generate, getConfig } from "./lib/nschema";
const argv = minimist(process.argv.slice(2));
const files = argv._;
if (argv.features) {
    features();
}
else {
    files.forEach(item => {
        if (item.indexOf("/") !== 0) {
            item = path.resolve(process.cwd(), item);
        }
        const r = require(item);
        generate(getConfig(path.dirname(item)), r);
    });
}
//# sourceMappingURL=cli.js.map