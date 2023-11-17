import axios from "axios";

import { consoleProgress, Counter, doInParallel } from "./mods/util";

const loadId = "6206558b-546c-455c-bdf0-662bb74050cc";
let neptuneUrl = "https://neptune-dev-database-1.cluster-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/loader/"
neptuneUrl += loadId
neptuneUrl += "?details=true&errors=true&page=";

const frameSize = 30; // errors  per page

interface Err {
    errorCode: string; //'FROM_OR_TO_VERTEX_ARE_MISSING'
    errorMessage: string; // "Either from vertex, 'doid_0040029', or to vertex, 'chebi_45924', is not present."
    fileName: string; // 's3://concept-graph-neptune/doid/edges.csv'
    recordNum: number; // 0
};

const counter = new Counter();

(async () => {
    let page: number = 0;
    let totalPages = 0;
    let errors: Err[];

    do {
        const emptyArr = [];
        for (let i = 1; i <= 50; i++) {
            emptyArr.push(i);
        }

        await doInParallel(emptyArr, async () => {
            page++;
            const fullUrl = neptuneUrl + `${page}&errorsPerPage=${frameSize}`;
            let resp: any = await axios.get(fullUrl);
            if (totalPages === 0) {
                totalPages = Math.round(Number(resp.data.payload.overallStatus.insertErrors) + 0.5);
            }
            errors = resp?.data?.payload?.errors?.errorLogs || [];
            for (const err of errors) {
                counter.add(err.errorCode);
                const missedNode = err.errorMessage.split("or to vertex,").pop().replace(/, is not present./g, "").replace(/'/g, "").replace(/ /g, "");
                const prefix = missedNode.split("_")?.[0];
                counter.add(`missed ontology -> ${prefix}`);
                // console.log(missedNode)
            }

            consoleProgress(page, totalPages);
        });
    } while (errors && errors.length > 0)

    console.log(counter.getAsArr());
})();