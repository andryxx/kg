console.time("script");
import { Logger } from "../../mods/logger";
import { Counter, parseCSV } from "../../mods/util";

const csvFile = "./pharmobkg/drugs/source_drugs.csv";
const outputFile = "./pharmobkg/drugs/nodes.drugs.generics.csv";
const edgesCsvFile = "./pharmobkg/drugs/edges.drugs.generics.csv";


const uploadDate = "2023-10-19T09:04:40.920Z";
const source = "pgkb";

const counter = new Counter();

const nodes = new Logger(outputFile, {
    withQuotes: "IfNeeded", separator: ",", header: [
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
    ]
});

const edges = new Logger(edgesCsvFile, {
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

(async () => {
    await nodes.clear();
    await edges.clear();

    const dataSet = await parseCSV(csvFile, { separator: "," });
    console.log("rows", dataSet.length)
    for (const dataRow of dataSet) {
        const {
            "PharmGKB Accession Id": id,
            "Generic Names": gNames,
            // "Type": drugType,
        } = dataRow;
    
        if (!gNames) {
            counter.add("drugs without generics");
            continue;
        }
        counter.add("drugs with generics");
        const drugNodeId = ["pgkb", id.toLowerCase()].join("_");

        let gCount = 1;
        for (const generic of gNames.replace(/"/g, "").split(", ")){
            const tradeNameId = ["pgkb", id.toLowerCase(), "generic", gCount++].join("_");
            await nodes.write([
                tradeNameId, // "~id", // ?	~id
                "drug_tradename", // "~label", // ?	~label  // human_disease
                "DP", // "node_tty:String",
                "Drug Product", // "node_tty_text:String",
                id, // "node_code:String",
                generic, // `"node_name:String"`,
                "pharmgkb", // "node_source_1:String",
                // // ?	node_source_2:String
                "atom", // "type:String", // ?	
                uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
            ]);
            counter.add("generics added");
            await logEdgesPair({ from: drugNodeId, to: tradeNameId, directLbl: "Has generic", invertedLbl: "Generic of"}, edges);
        }
    }

    console.log(counter.getAsArr());
})();
console.timeEnd("script");
