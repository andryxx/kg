console.time("script");
import { Logger } from "../../mods/logger";
import { Counter, parseCSV } from "../../mods/util";

const mappingFile = "./pharmobkg/drugs/mapping.pgkb.umls.csv";
const edgesFile = "./pharmobkg/drugs/edges.drugs.pgkb.umls.csv";
const umlsNodesFile = "./pharmobkg/drugs/existing.nodes.unmls.csv";

const uploadDate = "2023-10-19T09:04:40.920Z";
const source = "pgkb";

const edges = new Logger(edgesFile, {
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

const logEdge = async (rowData: ReportRowData, csv: Logger) => {
    if (!csv) throw new Error("The logger object not defined");

    const { from, to, eType, eLbl } = rowData;
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

const logEdgesPair = async ({ from, to, directLbl, invertedLbl }, csv): Promise<void> => {
    await logEdge({
        from,
        to,
        eType: directLbl.toLowerCase().replace(/ /g, "_"),
        eLbl: directLbl,
    }, csv);

    await logEdge({
        from: to,
        to: from,
        eType: invertedLbl.toLowerCase().replace(/ /g, "_"),
        eLbl: invertedLbl,
    }, csv);
};



const counter = new Counter();
(async () => {
    edges.clear();

    const umlsNodes = await parseCSV(umlsNodesFile, { separator: "," })
        .then(dset => dset.reduce((accum, item) => {
            const { id, "found as original": found } = item;
            accum[id] = found === "yes";
            return accum;
        }, {}));
    const dataSet = await parseCSV(mappingFile, { separator: "," });


    for (const dataRow of dataSet) {
        const {
            "pgkb": pgkbId,
            "UMLS": umlsId,
        } = dataRow;

        if (!umlsId) {
            counter.add("drugs without umls concept");
            continue;
        }
        const pgkbNodeId = ["pgkb", pgkbId.toLowerCase()].join("_");
        const umlsNodeId = ["umls", umlsId].join("_");

        if (!umlsNodes[umlsNodeId]) {
            counter.add("drugs without umls concept");
            continue;
        }

        await logEdgesPair({
            from: pgkbNodeId,
            to: umlsNodeId,
            directLbl: "Is a",
            invertedLbl: "Is a",
        }, edges);
        counter.add("linked drugs");
        // return;

        // const pgkbNodeId = 


        // counter.add("originally not mapped", notMapped);
    }


    console.log(counter.getAsArr());
})();
