console.time("script");
import { Logger } from "../../mods/logger";
import { Counter, parseCSV, timeout } from "../../mods/util";

const counter = new Counter();

const sourceFiles = [
    "./pharmobkg/pubmed.refs/asource4.csv",
    "./pharmobkg/pubmed.refs/clinical_ann_evidence.csv",
    "./pharmobkg/pubmed.refs/clinical_ann_evidence_2.csv",
    "./pharmobkg/pubmed.refs/automated_annotations.csv",
];

const outputFile = "./pharmobkg/pubmed.refs/pgkb.pubmed.references.csv";

const header = [
    "PGKB Node Id", // ?	~id
    "Pumbed ID", // ?	~label  // human_disease
    "PGKB Entity Type",
];

const csv = new Logger(outputFile, { withQuotes: "IfNeeded", separator: ",", header });

(async () => {
    await csv.clear();


    const uniques: Set<string> = new Set();

    for (const sourceFile of sourceFiles) {
        const dataSet = await parseCSV(sourceFile, { separator: "," });

        for (const dataRow of dataSet) {
            const {
                "Variant Annotation ID": vanno,
                "Clinical Annotation ID": canno,
                "Chemical ID": chemId,
                "PMID": pmid,
            } = dataRow;

            if (vanno) counter.add("variant annotations");
            if (canno) counter.add("clinical annotations");
            if (chemId) counter.add("chemical annotations");

            const entity = 
                (vanno || canno) ? "Annotation"
                : chemId ? "Chemical"
                : "Unknown";

            const pgkbNodeId = ["pgkb", (canno || vanno || chemId).toString().toLowerCase()].join("_");

            const unique = [pgkbNodeId, pmid, entity].join("|");
            uniques.add(unique);
        }

        for (const unique of uniques) {
            await csv.write(unique.split("|"));
        }

    }

    console.log(counter.getAsArr());
})();
console.timeEnd("script");
