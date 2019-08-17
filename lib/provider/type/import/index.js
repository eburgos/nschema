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
const path_1 = require("path");
const utils_1 = require("../../../utils");
function execute(parentConfig, nschema, context) {
    return __awaiter(this, void 0, void 0, function* () {
        if (parentConfig.$type !== "import") {
            throw new Error("Invalid import task");
        }
        const location = parentConfig.$importLocation || "";
        const newLocation = path_1.resolve(parentConfig.$nschemaLocation || "", location);
        const cfg = utils_1.requireDefaultOrPackage(newLocation);
        return nschema.generate(parentConfig, cfg, context);
    });
}
const $import = {
    description: "Reference external files in your NSchema tasks",
    execute,
    name: "import",
    type: "type",
    init(nschema) {
        return __awaiter(this, void 0, void 0, function* () {
            nschema.register("type", this);
            return Promise.resolve(null);
        });
    }
};
exports.default = $import;
