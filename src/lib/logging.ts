export enum LogLevel {
  NoOutput = 0,
  Default = 1,
  Verbose = 2,
  Debug = 3
}

export const loggingConfig = {
  level: LogLevel.Default
};

export function writeLog(level: LogLevel, msg: string) {
  if (loggingConfig.level >= level) {
    // tslint:disable-next-line:no-console
    console.log(msg);
  }
}

export function writeError(msg: any) {
  console.error(msg);
}
