-- downloads the atoms from umls DB
/*
	~id
	~label
	node_tty:String
	node_tty_text:String
	node_code:String
	node_name:String
	node_source_1:String
	node_source_2:String
	type:String
	uploaded_at:Date
*/
SELECT
	CONCAT('umls_', AUI) as '~id',
	'atom' as 'type:String',
	a.CUI,
	REPLACE(REPLACE(LOWER(GROUP_CONCAT(DISTINCT s.STY SEPARATOR ';')), ' ', '_'), ',', '') as '~label',
	TTY as 'node_tty:String',
	d.EXPL as 'node_tty_text:String',
	CODE as 'node_code:String',
	STR as 'node_name:String',
	'umls' as 'node_source_1:String',
	'rxnorm' as 'node_source_2:String',
	'2023-08-09' as 'uploaded_at:Date'
FROM MRCONSO a 
JOIN MRSTY s 
	on s.CUI = a.CUI 
JOIN MRDOC d 
	on d.VALUE = a.TTY 
	AND d.DOCKEY = 'TTY' 
	AND d.TYPE = 'expanded_form'
WHERE SAB = 'RXNORM'
GROUP BY a.AUI;