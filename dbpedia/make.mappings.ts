import { bty, Counter, doInParallel, parseCSV } from "../mods/util";
import { Logger } from "../mods/logger";

// import config from "./config.json";

const entities = [
    // "drug",
    // "disease",
    "chemical",
    // "gene",
    // "proteins",
];


console.time("script duration");

const FRAME_SIZE = 100;
const FRAMES_NUM = 25;
const fileTemplate = "./dbpedia/data.*.csv";
// const fileTemplate = "./dbpedia/data.*.tiny.csv";

const mappFileTemplate = "./dbpedia/mapping.*.csv";

const errorFileName = "./dbpedia/error.log";
const errorFile = new Logger(errorFileName);


const counter = new Counter();

const allowedBranches = [
    "casNumber",
    "chEBI",
    "chEMBL",
    "diseasesDB",
    "drugbank",
    "drugs.com",
    "ecNumber",
    "fdaUniiCode",
    "hgncid",
    "icd10",
    "icd9",
    "kegg",
    "medlinePlus",
    "meshId",
    "oclc",
    "omim",
    "pubchem",
    "icdo",
    "pdb",
    "atcCode"
];
const ignoredBranches = new Set();

type TMappingRow = {
    ontologies: Object;
};

type TMapping = {
    mappingElement?: TMappingRow;
};

(async () => {
    await errorFile.clear();

    for (const entity of entities) {
        const fileName = fileTemplate.replace(/\*/g, entity);
        const dataSet = await parseCSV(fileName);

        const mapping: TMapping = {};
        // let i = 0;
        for (const dataRow of dataSet) {
            const { id, json } = dataRow;
            counter.add(`total ${entity} nodes`);

            if (!json) {
                counter.add(`empty ${entity} nodes`);
                continue;
            }

            const normalized = json;
            // .replace(/"{/g, `{`)
            // .replace(/}"/g, `}`)
            // .replace(/\\\\"/g, `'`)
            // .replace(/\\\"/g, `'`)
            // .replace(/\\"/g, `"`);
            try {
                // console.log(bty(dataRow));
                // console.log(normalized);
                const parsed = JSON.parse(normalized);
                const mappingObj = {};
                let nodeId = "dbpedia_";
                for (const key in parsed) {
                    if (!key.includes("ontology")) {
                        continue;
                    }
                    const ontology = key.split("/").pop();
                    if (ontology === "wikiPageID") nodeId = `${nodeId}${parsed[key][0].value}`;
                    if (!allowedBranches.includes(ontology)) {
                        ignoredBranches.add(ontology);
                        continue;
                    }
                    const [{ value }] = parsed[key];
                    mappingObj[ontology] = value;
                }
                mapping[nodeId] = mappingObj;
            } catch (e) {
                console.error(e);
                await errorFile.write(normalized);
                console.log("unable to parse element >>", id);
                process.exit(0);
            }
        }

        const ontologiesList: Set<string> = new Set();
        for (const ontologies of Object.values(mapping)) {
            for (const ontoName of Object.keys(ontologies)) ontologiesList.add(ontoName);
        }

        const mappFileName = mappFileTemplate.replace(/\*/g, entity);
        const ontos = Array.from(ontologiesList).sort();
        const mappingFile = new Logger(mappFileName, { header: ["nodeId", ...ontos] });
        await mappingFile.clear();

        for (const [nodeId, ontologies] of Object.entries(mapping)) {
            const mappRow = [nodeId];
            for (const onto of ontos) {
                const mappField = ontologies[onto] || "";
                mappRow.push(mappField);
            }

            if (mappRow.filter(item => item.length > 0).length > 1) {
                await mappingFile.write(mappRow);
                counter.add(`rows in ${entity} mapping`);
            } else counter.add(`unlinked ${entity} nodes`);
        }

        // END OF ENTITIES CYCLE
    }
    console.log("IGNORED BRANCHES >>\n", Array.from(ignoredBranches).sort().join("\n"));

    console.log(counter.getAsArr());
    console.timeEnd("script duration");
})();
