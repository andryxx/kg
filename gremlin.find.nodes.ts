console.time("script");

import gremlin from "gremlin";
import _ from "lodash";

import { Logger } from "./mods/logger";
import { doInParallel, parseCSV, consoleProgress } from "./mods/util";

const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

const csvFile = "./pharmobkg/drugs/mapping.pgkb.umls.csv";
// const csvFile = "./pharmobkg/chem/chem.mapping.csv";
// "./pharmobkg/nodes_drugs_atm_tradenames.csv";
const outputFile = "./pharmobkg/drugs/existing.nodes.unmls.csv";

const umlsIdField = "UMLS";

const endpoint = "wss://dev.cluster-ro-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY
// const endpoint = "wss://neptune-dev-database-1.cluster-ro-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ WRITE

const dc = new DriverRemoteConnection(endpoint, {});

const graph = new Graph();
const g = graph.traversal().withRemote(dc);

interface Node {
    id: string,
    label: string;
};

const getNode = (id: string): Promise<Node> => {
    return g.V().has("~id", id).toList().
        then(data => {
            const [resp] = JSON.parse(JSON.stringify(data));
            
            return resp;
        }).catch(error => {
            console.log("ERROR", error);
            // dc.close();
        });
};

const csv = new Logger(outputFile, {
    withQuotes: "IfNeeded", separator: ",", header: [
        "id", // ?	~id
        "found as original",
        "found in UpperCase",
    ]
});

const prefix = "umls_";
// const prefix = "pgkb_";

(async () => {
    await csv.clear();

    const dataSet = await parseCSV(csvFile, { separator: "," });

    const dataChunks = _.chunk(dataSet, 25);

    for (const dataSubSet of dataChunks) {
        await doInParallel(dataSubSet, async dataRow => {
            const nodeId = dataRow[umlsIdField].split("_").pop().split("(").shift();
            if (nodeId === "") return;
            // console.log(dataRow, { nodeId });
    
            const reportRow = [`${prefix}${nodeId}`, "no", "no"];
    
            const node = await getNode(`${prefix}${nodeId}`);
            if (node?.id) {
                reportRow[1] = "yes";
                reportRow[2] = "n/a";
            } else {
                const nodeInUpperCase = await getNode(`${prefix}${nodeId.toUpperCase()}`);
                reportRow[2] = nodeInUpperCase?.id ? "yes" : "no";
            }
    
            await csv.write(reportRow);
            // process.exit(0);
        });
        }
        dc.close();
})();
console.timeEnd("script");
