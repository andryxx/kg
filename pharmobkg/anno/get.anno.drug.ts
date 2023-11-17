console.time("script");
import { Logger } from "../../mods/logger";
import { Counter, parseCSV, timeout } from "../../mods/util";

const counter = new Counter();

const sourceFiles = [
    "./pharmobkg/anno/asource3.csv",
];

const outputFile = "./pharmobkg/anno/nodes.annotations.drug.csv";

const edgesVariFile = "./pharmobkg/anno/edges.anno.drug.variants.csv";
const edgesHaploFile = "./pharmobkg/anno/edges.anno.drug.haplo.csv";
const edgesGeneFile = "./pharmobkg/anno/edges.anno.drug.genes.csv";
const edgesDrugsFile = "./pharmobkg/anno/edges.anno.drug.drugs.csv";
// const edgesPhenoFile = "./pharmobkg/anno/edges.anno.drug.pheno.csv";

// const haploVariMppFile = "./mappings/variants_haplos.csv";
const geneNodesFile = "./pharmobkg/genes/nodes_genes.csv";
const drugsNodesFile = "./pharmobkg/drugs/nodes.drugs.csv";
const chemsNodesFile = "./pharmobkg/chem/nodes.chemicals.csv";
// const phenoNodesFile = "./pharmobkg/pheno/nodes_phenotypes.csv";
const variNodesFile = "./pharmobkg/variants/nodes.variants.csv";

const uploadDate = "2023-12-09T09:04:40.920Z";
const source = "pharmgkb";
const directLbl = "Has annotation";
const invertedLbl = "Annotation of";
const defaultLabels = { directLbl, invertedLbl };

const header = [
    "~id", // ?	~id
    "~label", // ?	~label  // human_disease
    // "node_tty:String",
    // "node_tty_text:String",
    "node_code:String(single)",
    "node_name:String(single)",
    "node_source_1:String(single)",
    "type:String(single)", // ?	
    "uploaded_at:Date", // "YYYY-MM-DD"
    "pmid:String(single)",
    "phenotype_category:String(single)",
    "significance:String(single)",
    "notes:String(single)",
    "sentence:String(single)",
    "alleles:String(single)",
    "is_plural:String(single)",
    "is_associated:String(single)",
    "direction_of_effect:String(single)",
    "pd_pk_terms:String(single)",
    "population_types:String(single)",
    "population_phenotypes:String(single)",
    "comparison_alleles:String(single)",
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

const annoCsv = new Logger(outputFile, { withQuotes: "IfNeeded", separator: ",", header });
const eVariCsv = new Logger(edgesVariFile, { withQuotes: "IfNeeded", separator: ",", header: headerEdges });
const eHaploCsv = new Logger(edgesHaploFile, { withQuotes: "IfNeeded", separator: ",", header: headerEdges });
const eGeneCsv = new Logger(edgesGeneFile, { withQuotes: "IfNeeded", separator: ",", header: headerEdges });
const eDrugsCsv = new Logger(edgesDrugsFile, { withQuotes: "IfNeeded", separator: ",", header: headerEdges });
// const ePhenoCsv = new Logger(edgesPhenoFile, { withQuotes: "IfNeeded", separator: ",", header: headerEdges });

interface ReportRowData {
    from: string;
    to: string;
    eType: string;
    eLbl: string;
};

const isVariant = (str: string): boolean => str.startsWith("rs");

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

const makeHaploId = (haplo: string): string => `pgkb_${haplo.toLowerCase().replace(/[-+*:]/g, "_")}`;

// const makeVariId = (vari: string): string => `pgkb_${vari.toLowerCase()}`;

const getSplitSym = (str: string): string => str.includes(";") ? ";" : ",";

(async () => {
    await annoCsv.clear();
    await eVariCsv.clear();
    await eHaploCsv.clear();
    await eGeneCsv.clear();
    await eDrugsCsv.clear();
    // await ePhenoCsv.clear();

    const variMapping = await parseCSV(variNodesFile, { separator: "," })
        .then(dataSet => dataSet.reduce((accum, dataRow) => {
            const {
                "node_name:String": variantId,
                "~id": variNodeId,
            } = dataRow;

            accum[variantId] = variNodeId;
            return accum;
        }, {}));

    const genesMapping = await parseCSV(geneNodesFile, { separator: "," })
        .then(dataSet => dataSet.reduce((accum, dataRow) => {
            const {
                "symbol:String": symbol,
                "~id": geneNodeId,
            } = dataRow;

            accum[symbol] = geneNodeId;
            return accum;
        }, {}));

    const drugsMapping = await parseCSV(drugsNodesFile, { separator: "," })
        .then(dataSet => dataSet.reduce((accum, dataRow) => {
            const {
                "node_name:String(single)": drugName,
                "~id": nodeId,
            } = dataRow;

            accum[drugName] = nodeId;
            return accum;
        }, {}));

    const chemMapping = await parseCSV(chemsNodesFile, { separator: "," })
        .then(dataSet => dataSet.reduce((accum, dataRow) => {
            const {
                "node_name:String(single)": chemName,
                "~id": nodeId,
            } = dataRow;

            accum[chemName] = nodeId;
            return accum;
        }, {}));

    // const phenoMapping = await parseCSV(phenoNodesFile, { separator: "," })
    //     .then(dataSet => dataSet.reduce((accum, dataRow) => {
    //         const {
    //             "node_name:String": nodeName,
    //             "~id": nodeId,
    //         } = dataRow;

    //         accum[nodeName] = nodeId;
    //         return accum;
    //     }, {}));



    // console.log(genesMapping);

    for (const sourceFile of sourceFiles) {
        const dataSet = await parseCSV(sourceFile, { separator: "," });

        console.log("rows", dataSet.length)
        for (const dataRow of dataSet) {
            const {
                "Variant Annotation ID": pgkbId,

                "Drug(s)": drugsStr,
                // "Phenotype(s)": phenosStr,
                "Variant/Haplotypes": haplosStr,
                "Gene": genesStr,
                "PMID": pmid,
                "Phenotype Category": phenotypeCategory,
                "Significance": significance,
                "Notes": notes,
                "Sentence": sentence,
                "Alleles": alleles,
                "isPlural": isPlural,
                "Is/Is Not associated": isAssociated,
                "Direction of effect": directionOfEffect,
                "PD/PK terms": pdPkTerms,
                "Population types": populationTypes,
                "Population Phenotypes or diseases": populationPhenotypes,
                "Comparison Allele(s) or Genotype(s)": comparisonAlleles,

            } = dataRow;

            const annoNodeId = ["pgkb", pgkbId.toLowerCase()].join("_");
            await annoCsv.write([
                annoNodeId, // "~id", // ?	~id
                "annotation;variant_annotation", // "~label", // ?	~label  // human_disease
                // tty, // "node_tty:String",
                // ttyText, // "node_tty_text:String",
                pgkbId, // "node_code:String",
                `Variant Annotation ${pgkbId}`, // `"node_name:String"`,
                source, // "node_source_1:String",
                // // ?	node_source_2:String
                "atom", // "type:String", // ?	
                uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
                pmid, // "pmid:String(single)",
                phenotypeCategory, // "phenotype_category:String(single)",
                significance, // "significance:String(single)",
                notes, // "notes:String(single)",
                sentence, // "sentence:String(single)",
                alleles, // "alleles:String(single)",
                isPlural, // "is_plural:String(single)",
                isAssociated, // "is_associated:String(single)",
                directionOfEffect, // "direction_of_effect:String(single)",
                pdPkTerms, // "pd_pk_terms:String(single)",
                populationTypes, // "population_types:String(single)",
                populationPhenotypes, // "population_phenotypes:String(single)",
                comparisonAlleles, // "comparison_Alleles:String(single)",
            ]);
            counter.add("nodes");

            for (const haploOrVariant of haplosStr.replace(/ /g, "").split(",")) {
                if (isVariant(haploOrVariant)) {
                    // variant
                    const varianNodeId = variMapping[haploOrVariant];
                    await logEdgesPair({
                        from: varianNodeId,
                        to: annoNodeId,
                        ...defaultLabels,
                    }, eVariCsv);
                    counter.add("edges pairs added: variant/annotation");
                } else {
                    // haplotype
                    const haploNodeId = makeHaploId(haploOrVariant);
                    await logEdgesPair({
                        from: haploNodeId,
                        to: annoNodeId,
                        ...defaultLabels,
                    }, eHaploCsv);
                    counter.add("edges pairs added: haplotype/annotation");
                }
            }

            for (const symbol of genesStr.replace(/ /g, "").split(getSplitSym((genesStr)))) {
                if (!symbol) continue;

                const geneNodeId = genesMapping[symbol];
                if (!geneNodeId) {
                    counter.add("missed genes",);
                    console.log(pgkbId, "missed gene ->", symbol);
                    continue;
                }
                await logEdgesPair({
                    from: geneNodeId,
                    to: annoNodeId,
                    ...defaultLabels,
                }, eGeneCsv);
                counter.add("edges pairs added: gene/annotation");
            }

            if (drugsStr) {
                for (const drugName of drugsStr.split(";").map(str => str.trim())) {
                    if (!drugName) continue;

                    const nodeId = drugsMapping[drugName] || chemMapping[drugName];
                    if (!nodeId) {
                        counter.add("missed drugs",);
                        console.log(pgkbId, "missed drug ->", drugName);
                        continue;
                    }
                    await logEdgesPair({
                        from: nodeId,
                        to: annoNodeId,
                        ...defaultLabels,
                    }, eDrugsCsv);
                    counter.add("edges pairs added: drug/annotation");
                }
            }

            // if (phenosStr) {
            //     for (const phenoName of phenosStr.split(";").map(str => str.trim())) {
            //         if (!phenoName) continue;

            //         const nodeId = phenoMapping[phenoName];
            //         if (!nodeId) {
            //             counter.add("missed phenotypes",);
            //             console.log(pgkbId, "missed phenotype ->", phenoName);
            //             continue;
            //         }
            //         await logEdgesPair({
            //             from: nodeId,
            //             to: annoNodeId,
            //             ...defaultLabels,
            //         }, ePhenoCsv);
            //         counter.add("edges pairs added: phenotype/annotation");
            //     }
            // }
        }
    }

    console.log(counter.getAsArr());
})();
console.timeEnd("script");
