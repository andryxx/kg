import dps from 'dbpedia-sparql-client';

import { bty, Counter, doInParallel } from "../mods/util";
import { Logger } from "../mods/logger";

import config from "./config.json";

console.time("script duration");

const FRAME_SIZE = 100;
const FRAMES_NUM = 25;
const fileTemplate = "./links.*.csv";

const counter = new Counter();

const getChunk = (queryBase, offset: number, limit: number = FRAME_SIZE): Promise<string[]> => {
    const query = `${queryBase} LIMIT ${limit.toString()} OFFSET ${offset.toString()}`;

    return new Promise((resolve, reject) => {
        dps
            .client()
            .query(query)
            .timeout(15000) // optional, defaults to 10000
            .asJson()       // or asXml()
            .then(r => {
                const results: any[] = r.results.bindings;
                const FRAME_SIZEResult = [];
                for (const result of results) {
                    const keys = Object.keys(result);
                    if (keys.length > 1) {
                        console.log("The response contains more then 1 key! ->", keys.join(" | "));
                        reject;
                    }
                    const [key] = keys;
                    const { value } = result[key];

                    FRAME_SIZEResult.push(value);
                }
                resolve(FRAME_SIZEResult);
            })
            .catch(e => {
                1
                console.error(e);
                console.log("ERROR >>", e.message);
                reject(e);
            });

    });
};

(async () => {

    // const query = config["disease"];

    for (const [entity, query] of Object.entries(config)) {
        console.log("loading", entity);
        const fileName = fileTemplate.replace(/\*/g, entity);
        const file = new Logger(fileName, { header: ["link"]});
        await file.clear();

        let offset = 0;
        let finished = false;

        do {
            const offsets = [];
            for (let i = 0; i < FRAMES_NUM; i++) {
                offsets.push(offset);
                offset += FRAME_SIZE;
            }

            await doInParallel(offsets, async currOffset => {
                let success = false;
                let resp;
                for (let tries = 0; tries < 5; tries++) {
                    try {
                        resp = await getChunk(query, currOffset);
                        success = true;
                        break;
                    } catch (e) {
                        console.error(e);
                    }

                }
                if (!success) throw new Error("unable to get data");
                // const resp = await getChunk(query, currffset);
            
                for (const item of resp) await file.write([item]);
                counter.add(entity, resp.length);
                console.log(entity, currOffset);
                if (resp.length === 0) finished = true;
            })
        } while (!finished);
    }

    console.log(counter.getAsArr());
    console.timeEnd("script duration");
})();
