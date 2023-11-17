SELECT
    CONCAT('umls_', r.CUI1) as '~from',
    CONCAT('umls_', r.CUI2) as '~to',
    r.REL as '~label',
    CONCAT('umls_', r.CUI1, '-', r.REL, '-', 'umls_', r.CUI2) as '~id',
    d.EXPL as 'edge_text:String',
    'rxnorm' AS 'edge_source_1:String',
    '2023-08-10' as 'uploaded_at'
FROM (SELECT DISTINCT CUI FROM MRCONSO WHERE SAB = 'RXNORM') as a
JOIN MRREL r
    ON r.CUI1 = a.CUI
    AND r.CUI2 IN (SELECT DISTINCT CUI FROM MRCONSO WHERE SAB = 'RXNORM') 
    AND r.STYPE1 = 'CUI'
    AND r.STYPE2 = 'AUI'
JOIN MRDOC d
    on d.VALUE = r.REL
    and d.DOCKEY = 'REL'
    AND d.TYPE = 'expanded_form';


/* wrong
SELECT
    CONCAT('umls_', r.CUI1) as '~from',
    CONCAT('umls_', r.CUI2) as '~to',
    r.REL as '~label',
    CONCAT('umls_', r.CUI1, '-', r.REL, '-', 'umls_', r.CUI2) as '~id',
    d.EXPL as 'edge_text',
    'rxnorm' AS 'edge_source',
    '2023-08-10' as 'uploaded_at'
FROM MRREL r
LEFT JOIN MRCONSO AS a1
    ON a1.CUI = r.CUI1
LEFT JOIN MRCONSO AS a2
    ON a2.CUI = r.CUI2
JOIN MRDOC d
    on d.VALUE = r.REL
    and d.DOCKEY = 'REL'
    AND d.TYPE = 'expanded_form'
WHERE a1.SAB = 'RXNORM'
    AND a2.SAB = 'RXNORM'
    AND r.STYPE1 = 'CUI'
    AND r.STYPE2 = 'CUI';
*/

-- "~id","~from","~to","~label","edge_text:String","edge_source_1:String","uploaded_at:Date"
SELECT
    CONCAT('umls_', AUI, '-is_atom_of-', 'umls_', CUI) AS '~id',
    CONCAT('umls_', AUI) AS '~from',
    CONCAT('umls_', CUI) AS '~to',
    'is_atom_of' as '~label',
    'is atom of' as 'edge_text:String',
    'umls' as 'edge_source_1:String',
    '2023-08-21' as 'uploaded_at'
FROM MRCONSO
where SAB = 'RXNORM';

SELECT
    CONCAT('umls_', CUI, '-is_concept_of-', 'umls_', AUI) AS '~id',
    CONCAT('umls_', CUI) AS '~from',
    CONCAT('umls_', AUI) AS '~to',
    'is_atom_of' as '~label',
    'is atom of' as 'edge_text:String',
    'umls' as 'edge_source_1:String',
    '2023-08-21' as 'uploaded_at'
FROM MRCONSO
where SAB = 'RXNORM';
