/* eslint-disable @typescript-eslint/no-var-requires */
import * as yargs from "yargs";
import { dirname, resolve as pathResolve } from "path";
import { setLogLevel } from "./lib/logging";
import { features, generate, getConfig } from "./lib/nschema";

declare let require: (name: string) => any;

const argv: any = yargs(process.argv.slice(2)).argv;
const files: string[] = argv._;

if (argv.logLevel) {
  setLogLevel(argv.logLevel);
}

if (argv.features) {
  features();
} else {
  files
    .reduce(async (acc, item) => {
      return acc.then(async () => {
        if (item.indexOf("/") !== 0) {
          item = pathResolve(process.cwd(), item);
        }
        const requiredItem = require(item);
        return generate(
          getConfig(dirname(item)),
          requiredItem.default ? requiredItem.default : requiredItem
        );
      });
    }, Promise.resolve())
    .then(
      () => {
        process.exit(0);
      },
      err => {
        console.error(err);
        process.exit(1);
      }
    );
}
