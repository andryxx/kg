console.time("script");
import { Logger } from "./mods/logger";

import { parseCSV } from "./mods/util";

const nodesFile = "./pharmobkg/nodes_drugs_atm_tradenames.csv";
const edgesCsvFile = "./pharmobkg/edges.drugs.tradenames.csv";
const uploadDate = "2023-09-26T09:04:40.920Z";
const prefix = "pgkb";
const source = "pgkb";

const csv = new Logger(edgesCsvFile, {
    withQuotes: false, separator: ",", header: [
        "~id",
        "~from",
        "~to",
        "~label",
        "edge_text:String",
        "edge_source_1:String",
        "uploaded_at:Date"
    ]
});

interface ReportRowData {
    from: string;
    to: string;
    eType: string;
    eLbl: string;
};

const write = async (rowData: ReportRowData) => {
    const {from, to, eType, eLbl } = rowData;
    await csv.write([
        [from, eType, to].join("-"), // "~id",
        from, // "~from",
        to, // "~to",
        eType, // "~label",
        eLbl, // "edge_text:String",
        source, // "edge_source_1:String",
        uploadDate, // "uploaded_at:Date"
    ]);
};

(async () => {
    await csv.clear();

    const dataSet = await parseCSV(nodesFile, { separator: "," });

    for (const dataRow of dataSet) {
        const { "~id": atomId, "node_code:String" : nodeCode } = dataRow;
        const nodeId = [prefix, nodeCode.toLowerCase()].join("_");

        const repRow: ReportRowData = {
            from: atomId,
            to: nodeId,
            eType: "tradename_of",
            eLbl: "Tradename of",
        };
        await write(repRow);
        await write({
            from: nodeId,
            to: atomId,
            eType: "has_tradename",
            eLbl: "Has tradename",
        });
        // console.log(repRow);
    }
})();


console.timeEnd("script");