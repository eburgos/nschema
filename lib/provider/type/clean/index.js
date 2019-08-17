"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
const fs_1 = require("fs");
const path_1 = require("path");
const logging_1 = require("../../../logging");
const { red, green, yellow } = chalk_1.default;
function deleteFolderRecursive(folderPath, simulate) {
    if (fs_1.existsSync(folderPath)) {
        const files = fs_1.readdirSync(folderPath);
        files.forEach((file) => {
            const curPath = `${folderPath}/${file}`;
            if (fs_1.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath, simulate);
            }
            else {
                if (!simulate) {
                    fs_1.unlinkSync(curPath);
                }
                else {
                    logging_1.writeDebugLog(`${yellow("clean")}: simulating file delete: ${red(curPath)}`);
                }
            }
        });
        if (!simulate) {
            fs_1.rmdirSync(folderPath);
        }
        else {
            logging_1.writeDebugLog(`${yellow("clean")}: simulating folder delete: ${red(folderPath)}`);
        }
    }
}
function execute(parentConfig, _nschema) {
    return __awaiter(this, void 0, void 0, function* () {
        const arr = (parentConfig.target || []).map(i => {
            return i.location;
        });
        const len = arr.length;
        for (let cnt = 0; cnt < len; cnt += 1) {
            const cur = arr[cnt];
            const realFolder = path_1.resolve(cur);
            if (fs_1.existsSync(realFolder)) {
                if (fs_1.lstatSync(realFolder).isDirectory()) {
                    if (!parentConfig.simulate) {
                        logging_1.writeLog(logging_1.LogLevel.Default, `${red("deleting")} folder ${green(realFolder)}`);
                    }
                    deleteFolderRecursive(realFolder, !!parentConfig.simulate);
                }
                else {
                    if (!parentConfig.simulate) {
                        logging_1.writeLog(logging_1.LogLevel.Default, `${red("deleting")} file ${green(realFolder)}`);
                        fs_1.unlinkSync(realFolder);
                    }
                    else {
                        logging_1.writeDebugLog(`${yellow("clean")}: simulating file delete: ${red(realFolder)}`);
                    }
                }
            }
        }
        return Promise.resolve(true);
    });
}
const clean = {
    description: "Cleans directories. Normally used prior generation.",
    execute,
    name: "clean",
    init(nschema) {
        return __awaiter(this, void 0, void 0, function* () {
            nschema.register("type", this);
            return Promise.resolve(null);
        });
    },
    type: "type"
};
exports.default = clean;
