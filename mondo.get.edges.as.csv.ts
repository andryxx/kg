console.time("script");
import mysql from "mysql";

import { timeout } from "./mods/util";
import { Logger } from "./mods/logger";
import jsonData from "./mondo/edges.json";

const connection = mysql.createConnection({
    host: "medtest.csuiw8leicqh.us-east-1.rds.amazonaws.com",
    user: 'med_test',
    password: 'mXW1PE&#Qtdq',
    database: 'mondo'
});
connection.connect();

const UPDATE_CHUNK = 100;

const csvFile = "./mondo/edges.csv";
const nodesCsv = new Logger(csvFile, {
    header: [
        "id",
        "sub",
        "pred",
        "obj",
        "has_meta"
    ]
});

let metasFile = `./mondo/meta.of.nodes.part.1.csv`;
let metasCsv = new Logger(metasFile, {
    header: [
        // "id",
        "sub",
        "meta_type",
        "val",
        "xrefs",
        "pred",
        "synonym_type",
        "text",
        "sub_id",
    ]
});


interface Edge {
    sub: string;
    pred: string;
    obj: string;
    meta: any;
}

interface Meta {
    val: string;
    xrefs: Array<string>;
    pred: string;
    synonymType: string;
    text: string | String;
}

const data: any = jsonData;
const edges: Array<any> = data;

const getValOrNull = (val) => {
    return val ? `'${val.replace(/'/g, "\\'")}'` : "NULL";
};

let eid = 0;
const edgesBuffer: string[] = [];
const uploadEdge = async (edge: Edge | null): Promise<void> => {
    if (edge) edgesBuffer.push(`(${++eid}, '${edge.sub}', '${edge.pred}', '${edge.obj}', ${edge.meta ? "1" : "0"})`);

    if (eid % UPDATE_CHUNK === 0 || edge === null) {
        connection.query(`INSERT INTO mondo.edges (id, sub, pred, obj, has_meta) VALUES ${edgesBuffer.join(", ")};`,
            function (error, results, fields) {
                // console.log(">>", getValOrNull(dummy.val))
                if (error) throw error;
                // console.log('The solution is: ', results[0].solution);
                // process.exit(0);
            });
        edgesBuffer.length = 0;
    }
    if (eid % 1000 === 0) console.log(`edges uploaded: ${eid / 1000}k`)

    if (edge?.meta) {
        const metaTypes = Object.keys(edge.meta);
        for (const metaType of metaTypes) {
            const metaBranch = edge.meta[metaType];
            if (!Array.isArray(metaBranch)) {
                await uploadMeta(metaBranch, metaType, eid);
                continue;
            }
            for (const meta of metaBranch) {
                await uploadMeta(meta, metaType, eid);
            }
        }
    }
};

let mid = 0;
const metaBuffer: string[] = [];
const uploadMeta = async (meta: any, metaType: string | null, eid: number | null) => {
    if (meta) {
        let dummy: any = meta;
        if (typeof meta === 'string' || meta instanceof String) {
            dummy = {
                text: meta,
            }
        }

        metaBuffer.push(`(
            'E',
            ${getValOrNull(metaType)},
            ${getValOrNull(dummy.val)},
            ${getValOrNull(dummy.xrefs?.join(", "))},
            ${getValOrNull(dummy.pred)},
            ${getValOrNull(dummy.synonymType)},
            ${getValOrNull(dummy.text)},
            ${eid}
        )`);
    }

    if (mid % UPDATE_CHUNK === 0 || meta === null) {
        connection.query(`INSERT INTO mondo.metas (sub, meta_type, val, xrefs, pred, synonym_type, text, sub_id) VALUES ${metaBuffer.join(", ")};`,
            function (error, results, fields) {
                if (error) throw error;
            });

        metaBuffer.length = 0;
    }

    if (mid % 1000 === 0) console.log(`metas uploaded: ${mid / 1000}k`)
};

let edgesInFile = 0;
(async () => {
    for (const edge of edges) {
        await uploadEdge(edge);
        edgesInFile++;
    }
    await uploadEdge(null);
    await uploadMeta(null, null, null);

    console.timeEnd("script");
})();

console.log({ edgesInFile, edgesLoaded: eid });