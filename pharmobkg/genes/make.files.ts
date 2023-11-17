console.time("script");
import { Logger } from "../../mods/logger";
import { parseCSV } from "../../mods/util";

const csvFile = "./pharmobkg/genes/source.csv";
const outputFile = "./pharmobkg/genes/nodes_genes.csv";
const outputFileAltNames = "./pharmobkg/genes/nodes_genes_altnames.csv";
const outputFileAltSymbols = "./pharmobkg/genes/nodes_genes_altsymbols.csv";

const edgesFileAltNames = "./pharmobkg/genes/edges_genes_altnames.csv";
const edgesFileAltSymbols = "./pharmobkg/genes/edges_genes_altsymbols.csv";

const uploadDate = "2023-10-09T09:04:40.920Z";

const tty = "PT";
const ttyText = "Designated preferred name";

const source = "pharmgkb";

const header = [
    "~id", // ?	~id
    "~label", // ?	~label  // human_disease
    "node_tty:String",
    "node_tty_text:String",
    "node_code:String",
    "node_name:String",
    "node_source_1:String",
    // ?	node_source_2:String
    "type:String", // ?	
    "uploaded_at:Date", // "YYYY-MM-DD"
];

const headerEdges = [
    "~id",
    "~from",
    "~to",
    "~label",
    "edge_text:String",
    "edge_source_1:String",
    "uploaded_at:Date"
];


const nodesCsv = new Logger(outputFile, { withQuotes: "IfNeeded", separator: ",", header: [...header, "symbol:String"] });
const AltNamesNodesCsv = new Logger(outputFileAltNames, { withQuotes: "IfNeeded", separator: ",", header });
const AltSymbolsNodesCsv = new Logger(outputFileAltSymbols, { withQuotes: "IfNeeded", separator: ",", header: [...header, "symbol:String"] });
const AltNamesEdgesCsv = new Logger(edgesFileAltNames, { withQuotes: "IfNeeded", separator: ",", headerEdges });
const AltSymbolsEdgesCsv = new Logger(edgesFileAltSymbols, { withQuotes: "IfNeeded", separator: ",", headerEdges });

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
    origName: string = "",
): Promise<void> => {

    let gCount = 1;
    for (const entityName of splitNames(namesStr)) {
        const atomId = [nodeId, atomType, gCount++].join("_");
        const reportRow = [
            atomId, // "~id", // ?	~id
            atomType, // "~label", // ?	~label
            "EQ", // ttyAltNames, // "node_tty:String",
            "Equivalent name", // ttyTextAltNames, // "node_tty_text:String",
            pgkbId, // "node_code:String",
            origName || entityName, // `"node_name:String"`,
            source, // "node_source_1:String",
            // // ?	node_source_2:String
            "atom", // "type:String", // ?	
            uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
        ]; 
        if (origName) reportRow.push(entityName);
        await nCsv.write(reportRow);

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
    await AltNamesNodesCsv.clear();
    await AltSymbolsNodesCsv.clear();
    await AltNamesEdgesCsv.clear();
    await AltSymbolsEdgesCsv.clear();

    const dataSet = await parseCSV(csvFile, { separator: "," });
    console.log("rows", dataSet.length)
    for (const dataRow of dataSet) {
        const {
            "PharmGKB Accession Id": pgkbId,
            "Name": name,
            "Alternate Names": altNames,
            "Alternate Symbols": altSymbols,
            "Symbol": symbol,
        } = dataRow;

        const nodeId = `pgkb_${pgkbId.toLowerCase()}`;

        await nodesCsv.write([
            nodeId, // "~id", // ?	~id
            "gene", // "~label", // ?	~label  // human_disease
            tty, // "node_tty:String",
            ttyText, // "node_tty_text:String",
            pgkbId, // "node_code:String",
            name.replace(/"/g, "'"), // `"node_name:String"`,
            source, // "node_source_1:String",
            // // ?	node_source_2:String
            "atom", // "type:String", // ?	
            uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
            symbol,
        ]);

        if (altNames) {
            await makeAtomFiles(
                "gene_alt_name",
                AltNamesNodesCsv,
                AltNamesEdgesCsv,
                altNames,
                nodeId,
                pgkbId,
                { eType: "alternative_of", eLbl: "Alternative of" },
                { eType: "has_alternative", eLbl: "Has alternative" },
            );
        }

        if (altSymbols) {
            await makeAtomFiles(
                "gene_alt_symbol",
                AltSymbolsNodesCsv,
                AltSymbolsEdgesCsv,
                altSymbols,
                nodeId,
                pgkbId,
                { eType: "alternative_of", eLbl: "Alternative of" },
                { eType: "has_alternative", eLbl: "Has alternative" },
                name,
            );
        }

    }
})();
console.timeEnd("script");
