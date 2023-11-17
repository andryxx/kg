console.time("script");
import { Logger } from "../../mods/logger";
import { parseCSV } from "../../mods/util";

const csvFile = "./pharmobkg/chem/source.csv";
const outputFile = "./pharmobkg/chem/nodes.chemicals.csv";
const outputFileGen = "./pharmobkg/chem/nodes.chemicals.generics.csv";
const outputFileTn = "./pharmobkg/chem/nodes.chemicals.tradenames.csv";

const edgesFileGen = "./pharmobkg/chem/edges.chemicals.generics.csv";
const edgesFileTn = "./pharmobkg/chem/edges.chemicals.tradenames.csv";

const uploadDate = "2023-10-19T09:04:40.920Z";

const tty = "CCN";
const ttyText = "Chemical code name";

const source = "pharmgkb";

const header = [
    "~id", // ?	~id
    "~label", // ?	~label  // human_disease
    "node_tty:String(single)",
    "node_tty_text:String(single)",
    "node_code:String(single)",
    "node_name:String(single)",
    "node_source_1:String(single)",
    // ?	node_source_2:String
    "type:String(single)", // ?	
    "uploaded_at:Date", // "YYYY-MM-DD"

];

const headerEdges = [
    "~id",
    "~from",
    "~to",
    "~label",
    "edge_text:String(single)",
    "edge_source_1:String(single)",
    "uploaded_at:Date"
];


const nodesCsv = new Logger(outputFile, { withQuotes: "IfNeeded", separator: ",", header });
const genNodesCsv = new Logger(outputFileGen, { withQuotes: "IfNeeded", separator: ",", header });
const tnNodesCsv = new Logger(outputFileTn, { withQuotes: "IfNeeded", separator: ",", header });
const genEdgesCsv = new Logger(edgesFileGen, { withQuotes: "IfNeeded", separator: ",", header: headerEdges });
const tnEdgesCsv = new Logger(edgesFileTn, { withQuotes: "IfNeeded", separator: ",", header: headerEdges });

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

const splitNames = (str: string): string[] => str.replace(/"/g, "").split(", ");

interface edgeMeta {
    eType: string;
    eLbl: string;
};

const makeAtomFiles = async (
    atomType: string,
    nCsv: Logger,
    eCsv: Logger,
    namesStr: string,
    nodeId: string,
    pgkbId: string,
    dirEdgeMeta: edgeMeta,
    invEdgeMeta: edgeMeta,
    labels: string[],
): Promise<void> => {
    let gCount = 1;
    for (const entityName of splitNames(namesStr)) {
        const atomId = [nodeId, atomType, gCount++].join("_");
        await nCsv.write([
            atomId, // "~id", // ?	~id
            [`chemical_${atomType}`, ...labels].join(";"), // "~label", // ?	~label
            "EQ", // ttyGen, // "node_tty:String",
            "Equivalent name", // ttyTextGen, // "node_tty_text:String",
            pgkbId, // "node_code:String",
            entityName, // `"node_name:String"`,
            source, // "node_source_1:String",
            // // ?	node_source_2:String
            "atom", // "type:String", // ?	
            uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
        ]);

        await logEdge({
            from: atomId,
            to: nodeId,
            ...dirEdgeMeta,
        }, eCsv);

        await logEdge({
            from: nodeId,
            to: atomId,
            ...invEdgeMeta,
        }, eCsv);
    }
};

(async () => {
    await nodesCsv.clear();
    await genNodesCsv.clear();
    await tnNodesCsv.clear();
    await genEdgesCsv.clear();
    await tnEdgesCsv.clear();

    const dataSet = await parseCSV(csvFile, { separator: "," });
    console.log("rows", dataSet.length)
    for (const dataRow of dataSet) {
        const {
            "PharmGKB Accession Id": pgkbId,
            "Name": name,
            "Generic Names": gNames,
            "Trade Names": tNames,
            "Type": typesStr,
        } = dataRow;

        const nodeId = `pgkb_${pgkbId.toLowerCase()}`;
        const labels = typesStr.split(", ").map(item => item.toLowerCase().replace(/ /g, "_"));

        await nodesCsv.write([
            nodeId, // "~id", // ?	~id
            ["chemical", ...labels].join(";"), // "~label", // ?	~label  // human_disease
            tty, // "node_tty:String",
            ttyText, // "node_tty_text:String",
            pgkbId, // "node_code:String",
            name.replace(/"/g, "'"), // `"node_name:String"`,
            source, // "node_source_1:String",
            // // ?	node_source_2:String
            "atom", // "type:String", // ?	
            uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
        ]);

        if (gNames) {
            await makeAtomFiles(
                "generic",
                genNodesCsv,
                genEdgesCsv,
                gNames,
                nodeId,
                pgkbId,
                { eType: "generic_of", eLbl: "Generic name of" },
                { eType: "has_generic", eLbl: "Has generic name" },
                labels,
            );
        }

        if (tNames) {
            await makeAtomFiles(
                "tradename",
                tnNodesCsv,
                tnEdgesCsv,
                tNames,
                nodeId,
                pgkbId,
                { eType: "tradename_of", eLbl: "Tradename of" },
                { eType: "has_tradename", eLbl: "Has tradename" },
                labels,
            );
        }

    }
})();
console.timeEnd("script");
