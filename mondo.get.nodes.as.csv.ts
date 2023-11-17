console.time("script");
import mysql from "mysql";

import { timeout } from "./mods/util";
import { Logger } from "./mods/logger";
import jsonData from "./mondo/nodes.json";

const connection = mysql.createConnection({
    host: "medtest.csuiw8leicqh.us-east-1.rds.amazonaws.com",
    user: 'med_test',
    password: 'mXW1PE&#Qtdq',
    database: 'mondo'
});
connection.connect();


const csvFile = "./mondo/nodes.csv";
const nodesCsv = new Logger(csvFile, {
    header: [
        "id",
        "node_id",
        "lbl",
        "type",
        "has_meta"
    ]
});




const data: any = jsonData;
const nodes: Array<any> = data;

const getValOrNull = (val) => {
    return val ? `'${val.replace(/'/g, "\\'")}'` : "NULL";
};

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

let mid = 0;
const rows: string[] = [];
const writeRow = async (meta, metaType, sid) => {
    if (mid % 10000 === 0) {
        const part = (mid + 10000) / 10000;
        metasFile = `./mondo/meta.of.nodes.part.${part}.csv`;
        metasCsv = new Logger(metasFile, {
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
        await timeout(1000);
        await metasCsv.clear();
        console.log(`loaded ${mid/1000}k`)
    }
    mid++;

    let dummy = meta;
    if (typeof meta === 'string' || meta instanceof String) {
        dummy = {
            text: meta,
        }
    }

    await metasCsv.write([
        // ++mid, // "id",
        "N", // "sub",
        metaType, // "meta_type",
        dummy.val, // "val",
        dummy.xrefs, // "xrefs",
        dummy.pred, // "pred",
        dummy.synonymType, // "synonym_type",
        dummy.text, // "text",
        sid, // "sub_id",
    ]);

    rows.push(`(
        'N',
        ${getValOrNull(metaType)},
        ${getValOrNull(dummy.val)},
        ${getValOrNull(dummy.xrefs?.join(", "))},
        ${getValOrNull(dummy.pred)},
        ${getValOrNull(dummy.synonymType)},
        ${getValOrNull(dummy.text)},
        ${sid}
    )`);

    if (mid % 25 === 0) {
        connection.query(`INSERT INTO mondo.metas
        (sub, meta_type, val, xrefs, pred, synonym_type, text, sub_id)
        VALUES ${rows.join(", ")};`, function (error, results, fields) {
            // console.log(">>", getValOrNull(dummy.val))
            if (error) throw error;
            // console.log('The solution is: ', results[0].solution);
            // process.exit(0);
        });
        rows.length = 0;
    }
};

let id = 0;

(async () => {
    await nodesCsv.clear();


    for (const node of nodes) {
        await nodesCsv.write([
            ++id,
            node.id, // "node_id",
            node.lbl, // "lbl",
            node.type, // "type",
            node.meta ? 1 : 0, // "has_meta"
        ])


        if (node.meta) {
            



            const metaTypes = Object.keys(node.meta);
            for (const metaType of metaTypes) {
                // console.log(metaType)
                const metaBranch = node.meta[metaType];
                if (!Array.isArray(metaBranch)) {
                    await writeRow(metaBranch, metaType, id);
                    continue;
                }
                for (const meta of metaBranch) {
                    await writeRow(meta, metaType, id);
                }
            }
        }
    }

    console.timeEnd("script");

})();