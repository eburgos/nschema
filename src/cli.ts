import * as minimist from "minimist";
import { dirname, resolve as pathResolve } from "path";
import { setLogLevel } from "./lib/logging";
import { features, generate, getConfig } from "./lib/nschema";

declare let require: (name: string) => any;

const argv = minimist(process.argv.slice(2));
const files: string[] = argv._;

if (argv.logLevel) {
  setLogLevel(argv.logLevel);
}

if (argv.features) {
  features();
} else {
  files.forEach(item => {
    if (item.indexOf("/") !== 0) {
      item = pathResolve(process.cwd(), item);
    }
    const r = require(item);

    generate(getConfig(dirname(item)), r.default ? r.default : r);
  });
}
