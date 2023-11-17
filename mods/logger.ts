import fs from "fs";
import moment from "moment";
import path from "node:path";

import { bty } from "./util";

type screenType = "slashing" | "doubling";

const currentTime = () => {
  const timestamt = new Date().toISOString();
  return moment(timestamt).format("DD.MM.YYYY HH:mm:ss");
};

const makeReportString = (arr, { separator = ";", withQuotes = "Always", screenUndefined = true, screenQuotes = true, screenRule }) => {
  let str = "";
  const screenSymb = `"`;
  const undefValues = [undefined, null, Number.NaN];
  const whatToScreen = new RegExp(screenSymb, "g");
  const howToScreen = screenRule === "doubling" ? `${screenSymb}${screenSymb}`
    : screenRule === "slashing" ? `\\${screenSymb}`
    : ">>> REPLACED SCREENING SYMBOL <<<";
  
  arr.forEach(field => {
    let val = screenQuotes && field ? field.toString().replace(whatToScreen, howToScreen) : field;
    val = screenUndefined && undefValues.includes(field) ? "" : val;

    const quotesIfNeeded: string = val.includes(separator) ? `"` : "";
    str = (withQuotes === "Always") ? `${str}${str === "" ? "" : separator}${quotesIfNeeded}${val}${quotesIfNeeded}` :
      (withQuotes === "IfNeeded") ? `${str}${str === "" ? "" : separator}"${val}"` :
      `${str}${str === "" ? "" : separator}${val}`;
  });
  return str;
};

// A stub
// TODO replace with correct interfaces for each object
interface DummyObject {
  [key: string]: any;
}

type QuotesVariants = "Always" | "Never" | "IfNeeded";

class Logger {
  destructor: any;
  errLog: boolean;
  exists: boolean;
  header: [string];
  headerSet: boolean;
  ttl: number;
  log: string;
  filePath: string;
  fileName: string;
  separator: string;
  screenUndefined: boolean;
  screenQuotes: boolean;
  withQuotes: QuotesVariants;
  screenRule: screenType;

  constructor(log, options: DummyObject = {}) {
    const {
      errLog = "./err.log", //
      header,
      ttl = 1 * 60 * 60 * 1000, // logFile's time to live - 1 hour by default,
      screenUndefined = true,
      screenQuotes = true,
      separator = ";",
      withQuotes = "Always",
      screenRule = "doubling",
    } = options;

    const logPath = path.dirname(log);

    if (log && !fs.existsSync(logPath)) {
      fs.mkdirSync(logPath);
    }

    this.destructor = undefined;
    this.errLog = errLog;
    this.exists = false; // true if file exists otherwise false
    this.header = header;
    this.headerSet = false;
    this.ttl = ttl;
    this.log = log;
    this.filePath = log;
    this.fileName = log.split("/").pop();
    this.separator = separator;
    this.screenUndefined = screenUndefined;
    this.screenQuotes = screenQuotes;
    this.withQuotes = withQuotes;
    this.screenRule = screenRule;
  }

  async write(orig, params: DummyObject = {}) {
    const {
      silent = true,
      timestamp = false,
      logfile = this.log,
      withQuotes = this.withQuotes,
      separator = this.separator,
      screenUndefined = this.screenUndefined,
      screenQuotes = this.screenQuotes,
      screenRule = this.screenRule,
    } = params;

    // if (this.destructor) clearTimeout(this.destructor);
    if (logfile === this.log) this.exists = true;

    // eslint-disable-next-line no-param-reassign
    if (Array.isArray(orig)) orig = makeReportString(orig, { separator, withQuotes, screenUndefined, screenQuotes, screenRule });

    return new Promise<void>((resolve, reject) => {
      const stamp = timestamp ? `[+] [${currentTime()}] ` : "";

      let headerPrefix = "";
      if (this.header && !this.headerSet) {
        this.headerSet = true;
        headerPrefix = `${makeReportString(this.header, {
          separator,
          withQuotes,
          screenUndefined,
          screenQuotes,
          screenRule,
        })}\n`;
      }
      const msg = `${headerPrefix}${stamp}${orig}\n`;
      // console.log(msg);
      fs.appendFile(logfile, msg, err => {
        // this.destructor = setTimeout(async () => {
        //     await this.del();
        // }, this.ttl);
        if (err) reject(err);
        resolve();
      });
      // console.log(msg, "- ok");
    });
  }

  writeErr(msg, payload) {
    const errId = Math.round(Date.now() / 1000);
    this.write(`${msg}. Plase see details in ${this.errLog} (id ${errId})`);

    const errMsg = `==================[${errId}]==================\n${payload.toString()}\n`;
    this.write(errMsg, { logFile: this.errLog });
  }

  rewrite(orig, params: DummyObject = {}) {
    console.log(">>>>")
    const {
      silent = true,
      timestamp = false,
      logfile = this.log,
      separator = this.separator,
      screenUndefined = this.screenUndefined,
      screenQuotes = this.screenQuotes,
      screenRule = this.screenRule,
    } = params;

    if (this.destructor) clearTimeout(this.destructor);
    if (logfile === this.log) this.exists = true;
    // eslint-disable-next-line no-param-reassign
    if (Array.isArray(orig)) orig = makeReportString(orig, { separator, screenUndefined, screenQuotes, screenRule });

    const stamp = timestamp ? `[x] [${currentTime()}] ` : "";
    const msg = `${stamp}${orig}\n`;
    fs.writeFile(logfile, msg, err => {
      if (err) throw err;
    });
    this.destructor = setTimeout(async () => {
      await this.del();
    }, this.ttl);
  }

  clear(logfile = this.log) {
    fs.writeFile(logfile, "", err => {
      if (err) throw err;
    });
  }

  del(logfile = this.log) {
    return new Promise<void>(resolve => {
      if (logfile === this.log) this.exists = false;
      fs.unlink(logfile, () => resolve());
    });
  }

  fileExists(logfile = this.log) {
    fs.readFile(logfile, (err, data) => {
      if (!err && data) {
        return true;
      }
      return false;
    })
    
  }
}

class ErrLogger {
  outputFile: string;

  log: any;

  counter: DummyObject;

  errorLogUrl: string;

  constructor(outputFile) {
    this.outputFile = outputFile;
    this.log = new Logger(outputFile);
    this.counter = {};
    this.errorLogUrl = "";
  }

  count(msg) {
    this.counter[msg] ? this.counter[msg]++ : (this.counter[msg] = 1);
  }

  async write(msg, details) {
    // console.log(msg);
    this.count(msg);
    await this.log.write(`${msg}\n${bty(details)}\n-----`, true);
  }

  getErrorsCount() {
    return Object.values(this.counter).reduce((accum, item) => accum + item, 0);
  }

  async show() {
    const totalErrors = this.getErrorsCount();
    if (!totalErrors) return;

    console.log(`Script finished with ${totalErrors} errors`);
    for (const err of Object.keys(this.counter)) console.log(`${this.counter[err]} errors: "${err}"`);
    // this.errorLogUrl = await uploadFile(this.outputFile);
    console.log(`Please find complete errors log at ${this.errorLogUrl}`);
  }

  getErrorLogUrl() {
    return this.errorLogUrl;
  }
}

export { Logger, ErrLogger };
