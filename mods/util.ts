/* eslint-disable @typescript-eslint/naming-convention,no-param-reassign */
import axios from "axios";
import beautify from "beautify";
// import fetch from "node-fetch";
import fs from "node:fs";
// import path from "node:path";
// import moment from "moment";
import { Readable } from "node:stream";
import csv from "csv-parser";

// import { config, file, getValueSet, clientData } from "../components";
// const Redis = require("./redis");
// const { deleteObject } = require("./storage/cassandra");

const bty = json => beautify(JSON.stringify(json), { format: "json" });

class Counter {
  counts: {
    [key: string]: number;
  };

  constructor() {
    this.counts = {};
  }

  add(alias: string, delta = 1) {
    this.counts[alias] ? (this.counts[alias] += delta) : (this.counts[alias] = delta);
  }

  clear(alias: string) {
    this.counts[alias] = 0;
  }

  get(alias?: string) {
    if (alias) {
      return this.counts[alias] ?? 0;
    }

    let result = "";
    for (const [key, val] of Object.entries(this.counts)) {
      const row = `${val}: ${key}`;
      result = `${result.length > 0 ? `${result}\n` : ""}${row}`;
    }
    return result;
  }

  getTotal(except?: string[] | string): number {
    let total = 0;
    for (const alias of Object.keys(this.counts)) {
      if (except?.includes(alias) || except === alias) continue;
      total += this.counts[alias];
    }
    return total;
  }

  getAsArr() {
    return Object.entries(this.counts).map(([key, val]) => `${val}: ${key}`);
  }

  getEntries() {
    return Object.entries(this.counts);
  }

  join(counter) {
    for (const alias in counter.counts) {
      this.add(alias, counter.get(alias));
    }
  }
}

const doInParallel = async (arr, fn) => {
  return Promise.all(
    arr.map(
      (item) =>
        new Promise(async (resolve, reject) => {
          try {
            resolve(await fn(item));
          } catch (e) {
            reject(e);
          }
        }),
    ),
  );
};

// const getLatestObject = objectsArr => {
//   if (!Array.isArray(objectsArr)) return null;
//   if (objectsArr.length === 0) return null;

//   const [latest = {}] = objectsArr.sort((item1, item2) => {
//     return new Date(item1.created_at) < new Date(item2.created_at) ? 1 : -1;
//   });

//   return latest;
// };

// const getStrDate = (format = "YYMMDD.hhmm") => moment().format(format);

// const isIsoDate = str => {
//   if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str)) return false;
//   const data = new Date(str);
//   return data.toISOString() === str;
// };

// const getType = url => {
//   const objectRe = /-[\D\d]\d.json$/;
//   const edgeRe = /-[\D\d]\d_\D/;
//   switch (true) {
//     case objectRe.test(url):
//       return "object";
//     case edgeRe.test(url):
//       return "edge";
//     default:
//       throw new Error(`Entered to default section in getType switch-case. Value: ${url}`);
//   }
// };

const timeout = async ms => new Promise(res => setTimeout(res, ms));

// const uploadFile = async filePath => {
//   try {
//     const { size } = await fs.promises.stat(filePath);
//     const fileName = encodeURIComponent(path.basename(filePath));
//     const stream = fs.createReadStream(filePath);
//     return fetch(`https://transfer.dev.flowhealthlabs.com/${fileName}`, {
//       method: "PUT",
//       body: stream,
//       headers: { "Content-length": size.toString() },
//     }).then(res => res.text());
//   } catch (error) {
//     throw new Error(`Unable to upload shared file "${filePath}": ${error.message}`);
//   }
// };

// const internalUploadFile = async (filePath, mime_type, title) => {
//   const stream = fs.createReadStream(filePath);
//   try {
//     const { size } = await fs.promises.stat(filePath);
//     const fileObj = await file.internalUploadFile({
//       params: {
//         mime_type,
//         title: encodeURIComponent(title),
//         kind: "file",
//       },
//     });

//     await fetch(fileObj.upload_url, {
//       method: "PUT",
//       body: stream,
//       headers: {
//         "Content-Type": fileObj.mime_type,
//         "Content-Length": size.toString(),
//       },
//     });
//     return fileObj;
//   } catch (error) {
//     throw new Error(`Unable to upload internal file "${filePath}": ${error.message}`);
//   }
// };

// async function createFileObj(buffer, mime_type, title) {
//   const data = Uint8Array.from(buffer).buffer;

//   const fileObj = await file.internalUploadFile({
//     params: {
//       mime_type,
//       title: encodeURIComponent(title),
//       kind: "file",
//     },
//   });

//   await axios({
//     url: fileObj.upload_url,
//     method: "PUT",
//     data,
//     maxContentLength: data.byteLength,
//     maxBodyLength: data.byteLength,
//     headers: {
//       "Content-type": fileObj.mime_type,
//     },
//   });

//   return fileObj;
// }

// const convertAsObject = (arr, key = "id") => {
//   return arr.reduce((accum, item) => {
//     accum[item[key]] = item;
//     return accum;
//   }, {});
// };

// /**
//  * @param {String} url Direct download link
//  * @param {String} dataType Default buffer.
//  */
// const downloadFile = async (url, dataType = "buffer") => {
//   // eslint-disable-next-line no-console
//   console.log(
//     "\u001B[31m" +
//       "WARNING: The method ./mods/util.downloadFile can work inproperly. in case of inconsistency please use ./mods/util.downloadFile2 method" +
//       "\u001B[0m",
//   );
//   const requestParams: any = {
//     method: "get",
//     url,
//     headers: {},
//   };
//   if (dataType !== "json") requestParams.responseType = "stream";
//   else requestParams.headers["Content-Type"] = "application/json";
//   return new Promise((resolve, reject) => {
//     axios(requestParams)
//       .then(response => {
//         const chunks = [];
//         if (dataType === "json") resolve(response.data); //no need to go ahead if dataType is JSON
//         response.data.on("data", data => {
//           chunks.push(data);
//         });

//         response.data.on("end", () => {
//           let result;

//           switch (dataType) {
//             case "buffer": {
//               result = chunks;
//               break;
//             }
//             case "string": {
//               result = chunks.toString();
//               break;
//             }
//             case "json": {
//               result = JSON.parse(chunks.toString());
//               break;
//             }
//             default: {
//               result = chunks;
//             }
//           }
//           resolve(result);
//         });

//         response.data.on("error", err => {
//           reject(err);
//         });
//       })
//       ["catch"](error => {
//         // eslint-disable-next-line no-console
//         console.log("Error on file download:", error.message);
//         reject(error);
//       });
//   });
// };

const downloadFile2 = async fileUrl => {
  const fileName = `./files/${Date.now()}.txt`;
  const writer = fs.createWriteStream(fileName);

  await axios({
    method: "get",
    url: fileUrl,
    responseType: "stream",
  }).then(response => {
    return new Promise<void | Error>((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on("error", err => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on("close", () => {
        if (!error) resolve();
      });
    });
  });

  const result = await fs.promises.readFile(fileName);
  await fs.promises.unlink(fileName);
  return result;
};

const parseCSV = async (source, { separator = ";", headers = true, sourceType = "file" } = {}): Promise<any[]> => {
  // console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
  if (/https:\/\//.test(source) || /http:\/\//.test(source)) source = await downloadFile2(source);
  return new Promise((resolve, reject) => {
    const results = [];
    const options: any = { separator };
    if (headers !== true) options.headers = headers;

    let csvHeaders = Array.isArray(headers) ? headers : [];
    let line = 0;

    const read = src => {
      src
        .pipe(csv(options))
        .on("headers", heads => {
          csvHeaders = heads;
        })
        .on("data", data => {
          line++;
          const keys = Object.keys(data);

          keys.forEach(
            key => !csvHeaders.includes(key) && reject(`Line ${line}: Header "${key}" does not exist in parsed object`),
          );

          results.push(data);
        })
        .on("end", () => {
          if (line !== results.length) reject("Amount of parsed objects dont match");
          resolve(results);
        });
    };

    if (sourceType === "file") {
      read(fs.createReadStream(source));
    } else if (sourceType === "string") {
      const readable = Readable.from([source]);
      read(readable);
    }
  });
};

// /**
//  * the source can be a local file or url
//  * @param {String} source
//  * @returns {Buffer} stream.
//  */

// const getStreamFromSource = async source => {
//   return /https:\/\//.test(source) || /http:\/\//.test(source)
//     ? (await axios.get(source, { responseType: "stream" })).data
//     : fs.createReadStream(source);
// };

// const csvStreamReader = async (
//   stream,
//   callback,
//   options: { separator: string; headers?: string[] | boolean } = { separator: ";", headers: true },
// ) => {
//   return new Promise<void>((resolve, reject) => {
//     let csvHeaders = Array.isArray(options.headers) ? options.headers : [];
//     let line = 0;
//     stream
//       .pipe(csv(options))
//       .on("headers", heads => {
//         csvHeaders = heads;
//       })
//       .on("data", data => {
//         line++;
//         const keys = Object.keys(data);
//         keys.forEach(
//           key => !csvHeaders.includes(key) && reject(`Line ${line}: Header "${key}" does not exist in parsed object`),
//         );
//         callback(data);
//       })
//       .on("close", () => {
//         resolve();
//       });
//   });
// };

// const getDstOffset = utcTime => {
//   // eslint-disable-next-line unicorn/consistent-function-scoping
//   const getDstTime = (year, { month, day }) => new Date(`${year}-${month}-${day}Z`);
//   const dayLightSaving =
//     getValueSet("daylight_saving").find(i => i.year === utcTime.getFullYear()) ||
//     getValueSet("daylight_saving").find(i => i.year === new Date().getFullYear());

//   const dlsStart = getDstTime(dayLightSaving.year, dayLightSaving.start);
//   const dlsEnd = getDstTime(dayLightSaving.year, dayLightSaving.end);

//   if (dlsStart < utcTime && dlsEnd > utcTime) return 1;
//   return 0;
// };

// interface GetLocalTimeFromUtcOptions {
//   offset?: number;
//   dst?: boolean;
//   requisition?: any;
//   location?: any;
//   timezone?: string;
//   format?: string;
//   showTimeZone?: boolean;
// }
// /**
//  * Convert utc time
//  * @param {String} utcTime date and time in UTC
//  * @param {Object} options detailed options
//  * @param {Number} options.offset difference with the UTC in hours
//  * @param {Boolean} options.dst day light saving parameter
//  * @param {Object} options.requisition Requisition object having fields collection_time_zone and collection_time_zone
//  * @param {Object} options.location PracticeLocation or other object having fields time_zone and dst
//  * @param {String} options.timezone alphabetic name of timezone. Default: pst
//  * @param {String} options.format outgoing date and time format. Default: "MM/DD/YYYY HH:mm"
//  * @param {Boolean} options.showTimeZone add to outgoing date and time format the TimeZone. Default: false
//  * @returns {String} local time as string.
//  */
// const getLocalTimeFromUtc = (
//   utcTime,
//   {
//     offset,
//     dst,
//     requisition,
//     location,
//     timezone = "pst",
//     format = "MM/DD/YYYY HH:mm",
//     showTimeZone = false,
//   }: GetLocalTimeFromUtcOptions,
// ) => {
//   if (!utcTime) return "n/a";
//   const utcTimeAsDate = new Date(utcTime);
//   let usTimeZone;
//   if (!offset) {
//     if (requisition?.collection_time_zone) {
//       timezone = requisition.collection_time_zone?.toLowerCase();
//       dst = requisition.collection_dst;
//     } else if (location) {
//       timezone = location.time_zone?.toLowerCase() || "pst";
//       dst = location.dst;
//     }
//     if (dst === undefined) dst = !["az", "hi", "pr"].includes(timezone.toLowerCase());

//     usTimeZone = getValueSet("us_time_zones").find(tz => tz.code === timezone);

//     if (!usTimeZone) return `${moment(utcTimeAsDate).format(format)} UTC`;
//     offset = usTimeZone.offset;
//   } else showTimeZone = false;

//   let totalOffset = offset;
//   let timezoneAbbr = usTimeZone?.display || timezone.toUpperCase();
//   if (dst) {
//     const dstOffset = getDstOffset(utcTimeAsDate);
//     totalOffset += dstOffset;
//     if (dstOffset && usTimeZone?.dstDisplay) timezoneAbbr = usTimeZone.dstDisplay;
//   }

//   const localTime = moment(utcTimeAsDate).add(totalOffset, "hours").utc().format(format);
//   if (showTimeZone) return `${localTime} ${timezoneAbbr}`;
//   return localTime;
// };

// const getUtcTimeFromLocal = (timeZoneCode, localTime) => {
//   const timeZones = getValueSet("us_time_zones").reduce((acc, current) => {
//     acc[current.code] = current.offset;
//     return acc;
//   }, []);
//   if (!timeZones[timeZoneCode]) return null;

//   return moment(localTime).add(-timeZones[timeZoneCode], "hours").toDate();
// };

// const round = (num, rank = 2) => {
//   const number = Number(num);
//   if (Number.isNaN(number)) return Number.NaN;
//   const rankVal = 10 ** rank;
//   return Math.round(number * rankVal) / rankVal;
// };

// const isObjectId = str => /^\w{8}(?:-\w{4}){3}-\w{12}-\w{2}$/.test(str);

// const secondsToHms = seconds => {
//   const numSec = Number(seconds);
//   if (Number.isNaN(numSec)) return seconds;

//   const hr = Math.floor(numSec / 3600);
//   const min = Math.floor((numSec % 3600) / 60);
//   const sec = Math.floor((numSec % 3600) % 60);

//   if (hr + min + sec === 0) return `${seconds}s`;
//   const result = `${sec.toString().padStart(2, "0")}s`;
//   if (hr) return `${hr.toString().padStart(2, "0")}h ${min.toString().padStart(2, "0")}m ${result}`;
//   if (min) return `${min.toString().padStart(2, "0")}m ${result}`;

//   return result;
// };

// const isProperDate = strDate =>
//   /\d{4}-[01]\d-[0-3]\dT[0-2](?:\d:[0-5]){2}\d\.\d+([+-][0-2]\d:[0-5]\d|Z)$/.test(strDate);

// const isInteger = value => typeof value !== "string" && !Number.isNaN(value) && value === Number.parseInt(value, 10);

// const getAge = (dob, certainDate = new Date()) => {
//   const birthday = new Date(dob);
//   const now = new Date(certainDate);
//   return moment(now).diff(birthday, "years");
// };

// // order: acs - the eldest firts; desc - the latest first
// const sortByDate = (arr: any[], field = "created_at", order = "asc") => {
//   const orderFix = order === "asc" ? 1 : -1;
//   return arr.sort((item1, item2) => {
//     return (new Date(item1[field]) > new Date(item2[field]) ? 1 : -1) * orderFix;
//   });
// };

// const convertToLocalTime = (date, dst = false, offset = 0) => {
//   const dayLightSaving = getValueSet("daylight_saving");
//   if (!date) return "";
//   date = new Date(date);
//   const times = date.getTime();
//   if (dst) {
//     const year = date.getFullYear();
//     const currentDayLightSaving = dayLightSaving.find(i => i.year === year);
//     if (currentDayLightSaving) {
//       const start = new Date(
//         `${currentDayLightSaving.year}-${currentDayLightSaving.start.month}-${currentDayLightSaving.start.day}`,
//       ).getTime();
//       const end = new Date(
//         `${currentDayLightSaving.year}-${currentDayLightSaving.end.month}-${currentDayLightSaving.end.day}`,
//       ).getTime();
//       const isDayLightSavingTime = times > start && times < end;
//       if (isDayLightSavingTime) offset += 1;
//     }
//   }

//   return new Date(times + offset * 3600000).toISOString();
// };

// const getObjectFromCache = () => {
//   const cache = {};

//   return async (objectId: string, expand = "") => {
//     if (!objectId) return;

//     if (!cache[objectId]) cache[objectId] = await clientData.getObject(objectId, { expand });
//     // eslint-disable-next-line consistent-return
//     return cache[objectId];
//   };
// };

// const performFunction = async ({ function_name, data }) => {
//   return axios({
//     method: "POST",
//     url: `${config.logic}/v2/internal/logic/perform_function`,
//     data: {
//       function_name,
//       data,
//     },
//     headers: {
//       "content-type": "application/json",
//     },
//   });
// };

// const retry = async (fn, params) => {
//   let err;
//   for (let i = 0; i < 3; i++) {
//     try {
//       return await fn(params);
//     } catch (error) {
//       err = error;
//       await timeout(1500);
//     }
//   }
//   throw err;
// };

// const isURL = (url: string) => /^(ftp|http|https):\/\/[^ "]+$/.test(url);

// const makeErrorWrapper =
//   <T>(errorHandler: (error: Error, logArgs: any) => T) =>
//   <A extends any[], R>(fn: (...arg: A) => R) =>
//   async (...arg: A): Promise<R | T> => {
//     try {
//       return await fn(...arg);
//     } catch (error) {
//       return errorHandler(error, [...arg]);
//     }
//   };

const consoleProgress = (curr, total, options = {}) => {
  const { progress = 0, label = "" }: any = options;
  if (total == 0) return;
  const completedLines = (progress - (progress % 150)) / 150;
  const crosses = progress < completedLines ? progress : completedLines;
  const dots = progress % 150;

  process.stdout.clearLine(0, () => { });
  process.stdout.cursorTo(0);
  process.stdout.write(`${label.length > 0 ? `[${label}] ` : ""}${((curr * 100) / total).toFixed(2)}% done${"".padStart(crosses, "x").padStart(dots, ".")}`);
  if (curr === total) console.log("");
};

export {
  bty,
  consoleProgress,
  // convertAsObject,
  doInParallel,
  // downloadFile,
  // downloadFile2,
  Counter,
  // internalUploadFile,
  // createFileObj,
  // getAge,
  // getLatestObject,
  // getLocalTimeFromUtc,
  // getUtcTimeFromLocal,
  // getStrDate,
  // getType,
  // isInteger,
  // isIsoDate,
  // isObjectId,
  // isProperDate,
  parseCSV,
  // getStreamFromSource,
  // csvStreamReader,
  // round,
  // secondsToHms,
  // sortByDate,
  timeout,
  // uploadFile,
  // convertToLocalTime,
  // getObjectFromCache,
  // performFunction,
  // retry,
  // isURL,
  // makeErrorWrapper,
};
