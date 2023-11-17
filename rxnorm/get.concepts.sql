-- downloads the concepts from umls DB
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
	CONCAT('umls_', p.CUI) as '~id',
	'concept' as 'type:String',
	REPLACE(LOWER(GROUP_CONCAT(DISTINCT s.STY SEPARATOR ';')), ' ', '_') as '~label',
	p.TTY as 'node_tty:String',
	d.EXPL as 'node_tty_text:String',
	p.CODE as 'node_code:String',
	p.STR as 'node_name:String',
	'umls' as 'node_source_1:String',
	LOWER(p.SAB) as 'node_source_2:String',
	'2023-08-17' as 'uploaded_at:Date'
FROM (SELECT DISTINCT CUI FROM MRCONSO WHERE SAB = 'RXNORM') a 
JOIN PREFATOM p 
	on p.CUI = a.CUI 
JOIN MRSTY s 
	on s.CUI = p.CUI 
JOIN MRDOC d 
	on d.VALUE = p.TTY 
	AND d.DOCKEY = 'TTY' 
	AND d.TYPE = 'expanded_form' 
GROUP BY p.CUI;