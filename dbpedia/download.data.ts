
import axios from "axios";
import fs from "fs";
import * as _ from "lodash";

import { bty, consoleProgress, doInParallel } from "../mods/util";
import { Logger } from "../mods/logger";
import { parseCSV } from "../mods/util";



// const sublink = "http://dbpedia.org/resource/Cadiot–Chodkiewicz_coupling";
// const link = `https://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=DESCRIBE%20%3Chttp%3A%2F%2Fdbpedia.org%2Fresource%2FCabazitaxel%3E&format=application%2Fmicrodata%2Bjson&FILTER%28LANG%28%3Fdescription%29%3D%27en%27%29`;
// const dbped = sublink.split("/").pop();
// const link = `http://dbpedia.org/data/${dbped}.jsxon`;

const srcFileTemplate = "./links.*.csv";
const dstFileTemplate = "./data.*.csv";
const nodesFileTemplate = "./nodes.*.csv";
const errFileTemplate = "./errors.*.csv";

const entities = [
    // "drug",
    // "disease",
    // "chemical",
    // "gene",
    "proteins",
];

const fileExists = (filepath): boolean => {
    if (fs.existsSync(filepath)) {
        return true;
    }
    return false;
};

const repHeader = [
    "~id",
    "~label",
    "abstract:String(single)",
    "node_code:String(single)",
    "node_name:String(single)",
    "node_source_1:String(single)",
    "node_source_2:String(single)",
    "uploaded_at:Date",
];

const normalize = str => (str || "").replace(/\n/g, "").replace(/";/g, ";,");

(async () => {
    for (const entity of entities) {

        const alreadyLoaded = new Set();
        const outputFile = dstFileTemplate.replace(/\*/g, entity);
        const nodesFile = nodesFileTemplate.replace(/\*/g, entity);
        const exists = fileExists(nodesFile);
        const dataRep = new Logger(outputFile, { header: exists ? null : ["id", "json"], withQuotes: "IfNeeded", screenRule: "slashing" });
        const nodesRep = new Logger(nodesFile, { header: exists ? null : repHeader, withQuotes: "IfNeeded", });
        if (!exists) await nodesRep.clear(); // create emptyfile

        const loadedData = await parseCSV(nodesFile);
        for (const dataRow of loadedData) {
            const { "node_name:String(single)": id } = dataRow;
            alreadyLoaded.add(id);
        }

        const sourceFile = srcFileTemplate.replace(/\*/g, entity);
        const sourceData = await parseCSV(sourceFile);

        let curr = 0;
        for (const dataChunk of _.chunk(sourceData, 10)) {
            await doInParallel(dataChunk, async ({ link }) => {
                consoleProgress(curr++, sourceData.length, { label: entity });
                const id = link.split("/").pop();
                if (alreadyLoaded.has(id)) return;

                const url = `http://dbpedia.org/data/${id}.json`;
                // const response = await axios.get(url);

                let success = false;
                let response;
                for (let tries = 0; tries < 3; tries++) {
                    try {
                        response = await axios.get(url);
                        success = true;
                        break;
                    } catch (e) {
                        console.log(e.message);
                    }
                }
                // if (!success) throw new Error("unable to get data");
                const nodeName = link.split("/").pop();
                if (!success) return await nodesRep.write(["", "", "", "LOAD ERRROR", nodeName, url, link, ""]);

                const data = response.data[link];
                if (!data) return await nodesRep.write(["", "", "", "NO DATA FOUND", nodeName, url, link, ""]);
                const json = JSON.stringify(data);
                await dataRep.write([id, normalize(json)]);

                const idxs = Object.keys(data);
                const idIdx: string = idxs.find(item => item.includes("wikiPageID"));
                const idBranch = data[idIdx];
                if (!idBranch) {
                    console.log(bty({data}));
                    console.log(bty(response.data));
                    console.log("wikiPageID not found");
                    return await nodesRep.write(["", "", "", "wikiPageID not found", nodeName, url, link, ""]);
                }
                const dpbId = idBranch[0].value;
                const comments = data["http://dbpedia.org/ontology/abstract"] || data["http://dbpedia.org/ontology/comment"];
                const abstract = comments ? comments.find(item => item.lang === "en")?.value || "" : "";

                const reportRow = [
                    ["dbpedia", dpbId].join("_"), // ~id
                    entity, // ~label
                    normalize(abstract), // abstract
                    dpbId, //"node_code:String(single)"
                    nodeName, // "node_name:String(single)"
                    "dbpedia", // "node_source_1:String(single)"
                    "dbpedia", // "node_source_2:String(single)": 
                    "2023-10-19",
                ];
                await nodesRep.write(reportRow);

                // process.exit(0);
            });
        }
    }





    // console.log(bty(row));
    // console.log(bty(data));
})();

// http://dbpedia.org&query=DESCRIBE%20<http://dbpedia.org/resource/Cabazitaxel>&format=application/microdata%2Bjson


