console.time("script");
import _ from 'lodash';
import mysql from 'mysql';


import { Logger } from "../../mods/logger";
import { doInParallel, parseCSV } from "../../mods/util";

const csvFile = "./pharmobkg/drugs/nodes.search.results.csv";
const outputFile = "./pharmobkg/drugs/nodes.drugs.umls.csv";

const uploadDate = "2023-10-02T09:04:40.920Z";

const csv = new Logger(outputFile, {
    withQuotes: "IfNeeded", separator: ",", header: [
        "~id", // ?	~id
        "~label", // ?	~label  // human_disease
        "node_tty:String",
        "node_tty_text:String",
        "node_code:String",
        `node_name:String`,
        "node_source_1:String",
        "node_source_2:String",
        "type:String", // ?	
        "uploaded_at:Date", // "YYYY-MM-DD"
    ]
});

const connection = mysql.createConnection({
    host: 'medtest.csuiw8leicqh.us-east-1.rds.amazonaws.com',
    user: 'med_test',
    password: 'mXW1PE&#Qtdq',
    database: 'med_test_2023AA'
});

connection.connect(function(err) {
    if (err) {
      console.error('>>>>>>>> error connecting: ' + err.stack);
      return;
    }
   
    console.log('connected as id ' + connection.threadId);
  });



(async () => {
    await csv.clear();
    const dataSet = await parseCSV(csvFile, { separator: "," })
        .then(ds => ds.filter(item => item.id !== "umls_"))
        .then(ds => ds.filter(item => item["found as original"] === "no"));
    console.log("rows", dataSet.length)

    for (const dataSubset of _.chunk(dataSet, 25)) {
        await doInParallel(dataSubset, async dataRow => {
            const {
                id,
                "found as original": found,
            } = dataRow;

            // connection.query(`SELECT 1 + 1 AS solution`, function (error, results, fields) {
            // const resp = connection.query(`SELECT * FROM MRCONSO WHERE CUI='${id.replace(/umls_/g, "")}';`, function (error, results, fields) {
            const resp = connection.query([
                "SELECT",
                "CONCAT('umls_', p.CUI) as 'id',",
                "'concept' as 'type',",
                "REPLACE(LOWER(GROUP_CONCAT(DISTINCT s.STY SEPARATOR ';')), ' ', '_') as 'label',",
                "p.TTY as 'node_tty',",
                "d.EXPL as 'node_tty_text',",
                "p.CODE as 'node_code',",
                "p.STR as 'node_name',",
                "'umls' as 'node_source_1',",
                "LOWER(p.SAB) as 'node_source_2'",
                "FROM MRCONSO a",
                "JOIN PREFATOM p on p.CUI = a.CUI",
                "JOIN MRSTY s on s.CUI = p.CUI",
                "JOIN MRDOC d",
                "on d.VALUE = p.TTY",
                "AND d.DOCKEY = 'TTY'",
                "AND d.TYPE = 'expanded_form'",
                `WHERE a.CUI='${id.replace(/umls_/g, "")}';`, 
            ].join(" "), 
            async function (error, results, fields) {
                if (error) throw error;
                const row = results[0];
                await csv.write([
                        row.id, // "~id", // ?	~id
                        row.label, // "~label", // ?	~label  // human_disease
                        row.node_tty, // "node_tty",
                        row.node_tty_text, // "node_tty_text",
                        row.node_code, // "node_code",
                        row.node_name, // `"node_name"`,
                        row.node_source_1, // "node_source_1",
                        row.node_source_2, // // ?	node_source_2
                        "concept", // "type", // ?	
                        uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
                    ]);
            });

                     
            });
        }
    connection.end();
})();
console.timeEnd("script");
