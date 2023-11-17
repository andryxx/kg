console.time("script");
import { Logger } from "../../mods/logger";

import { parseCSV } from "../../mods/util";

const mappingFile = "./pharmobkg/chem/chem.mapping.csv";
const edgesCsvFile = "./pharmobkg/chem/edges.chem.concepts.csv";
const uploadDate = "2023-09-02T09:05:40.920Z";
const prefix = "pgkb";
const source = "pgkb";

const csv = new Logger(edgesCsvFile, {
    withQuotes: false, separator: ",", header: [
        "~id",
        "~from",
        "~to",
        "~label",
        "edge_text:String(single)",
        "edge_source_1:String(single)",
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

    const dataSet = await parseCSV(mappingFile, { separator: "," });

    for (const dataRow of dataSet) {
        const { "pgkb": atomCode, "UMLS" : nodeCode } = dataRow;
        if (!nodeCode) continue;

        const nodeId = ["umls", nodeCode.split("(").shift()].join("_");
        const atomId = [prefix, atomCode.toLowerCase()].join("_");

        const repRow: ReportRowData = {
            from: atomId,
            to: nodeId,
            eType: "is_atom_of",
            eLbl: "Is atom of",
        };
        await write(repRow);
        await write({
            from: nodeId,
            to: atomId,
            eType: "is_concept_of",
            eLbl: "Is concept of",
        });
        // console.log(repRow);
    }
})();


console.timeEnd("script");