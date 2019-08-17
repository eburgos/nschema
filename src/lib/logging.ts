import chalk from "chalk";

const { bgYellow, red } = chalk;

/**
 * Logging level
 *
 * @export
 * @enum {number}
 */
export enum LogLevel {
  /**
   * Do not output
   */
  NoOutput = 0,

  /**
   * Default log level is no one else sets it
   */
  Default = 1,

  /**
   * Verbose
   */
  Verbose = 2,

  /**
   * Debug
   */
  Debug = 3
}

/**
 * Sets current log level
 *
 * @export
 * @param {("NoOutput" | "Default" | "Verbose" | "Debug")} level
 */
export function setLogLevel(
  level: "NoOutput" | "Default" | "Verbose" | "Debug"
) {
  switch (level) {
    case "NoOutput":
      loggingConfig.level = LogLevel.NoOutput;
      break;
    case "Debug":
      loggingConfig.level = LogLevel.Debug;
      break;
    case "Verbose":
      loggingConfig.level = LogLevel.Verbose;
      break;
    default:
      loggingConfig.level = LogLevel.Default;
  }
}

const loggingConfig = {
  level: LogLevel.Default
};

/**
 * Writes output to the log
 *
 * @export
 * @param {LogLevel} level
 * @param {string} msg
 */
export function writeLog(level: LogLevel, msg: string) {
  if (level !== LogLevel.NoOutput && loggingConfig.level >= level) {
    // tslint:disable-next-line:no-console
    console.log(msg);
  }
}

export function writeDebugLog(msg: string) {
  return writeLog(LogLevel.Debug, `${bgYellow(red("DEBUG:"))} ${msg}`);
}

/**
 * Write output to the error stream
 *
 * @export
 * @param {*} msg
 */
export function writeError(msg: any) {
  console.error(msg);
}
