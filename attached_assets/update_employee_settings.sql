-- Update employee payroll settings based on November 2025 payroll data
-- Values converted from cents to dollars (divided by 100)
-- Residency mapping: SINGAPOREAN, SINGAPORE PR → SPR, FOREIGN → FOREIGNER, NONE → null

-- 06001 - RAMADAS JAYARAM GOVINDASAMY
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 22500.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '06001' OR UPPER(name) LIKE '%RAMADAS JAYARAM GOVINDASAMY%';

-- 06002 - MANICKAN JAMUNA RANI
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 2000.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '06002' OR UPPER(name) LIKE '%MANICKAN JAMUNA RANI%';

-- 06003 - YUGUMARAN R
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 22500.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '06003' OR UPPER(name) LIKE '%YUGUMARAN%';

-- 14001 - MOSTAFIZUR RAHMAN
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 6900.00, default_mobile_allowance = 40.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '14001' OR UPPER(name) LIKE '%MOSTAFIZUR RAHMAN%';

-- 15001 - VELLAIKKANNU VADIVELU
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 4650.00, default_mobile_allowance = 30.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '15001' OR UPPER(name) LIKE '%VELLAIKKANNU VADIVELU%';

-- 16002 - PERUMAL GOVINDARASU
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 2300.00, default_mobile_allowance = 20.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '16002' OR UPPER(name) LIKE '%PERUMAL GOVINDARASU%';

-- 17001 - MALAIKKOLUNDHU KUMARAVEL
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 2300.00, default_mobile_allowance = 0.00, default_transport_allowance = 100.00, default_shift_allowance = 0.00
WHERE employee_code = '17001' OR UPPER(name) LIKE '%MALAIKKOLUNDHU KUMARAVEL%';

-- 17003 - RAJENDRAN DINESHVAIRAPATHI
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1900.00, default_mobile_allowance = 15.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '17003' OR UPPER(name) LIKE '%RAJENDRAN DINESHVAIRAPATHI%';

-- 17004 - VISHNU PRAVIN S/O R RAMAYA
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 3500.00, default_mobile_allowance = 30.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '17004' OR UPPER(name) LIKE '%VISHNU PRAVIN%';

-- 18001 - THIBAN RAMADAS
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 6000.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '18001' OR UPPER(name) LIKE '%THIBAN RAMADAS%';

-- 18003 - SUJAN AHMED
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 3500.00, default_mobile_allowance = 30.00, default_transport_allowance = 100.00, default_shift_allowance = 0.00
WHERE employee_code = '18003' OR UPPER(name) LIKE '%SUJAN AHMED%';

-- 21001 - HAQ AMINUL
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1100.00, default_mobile_allowance = 20.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '21001' OR UPPER(name) LIKE '%HAQ AMINUL%';

-- 21003 - SEENUVASAN RATHINAKUMAR
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1500.00, default_mobile_allowance = 20.00, default_transport_allowance = 100.00, default_shift_allowance = 0.00
WHERE employee_code = '21003' OR UPPER(name) LIKE '%SEENUVASAN RATHINAKUMAR%';

-- 21004 - GOVINDARAJU ANBALAGAN
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 4600.00, default_mobile_allowance = 30.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '21004' OR UPPER(name) LIKE '%GOVINDARAJU ANBALAGAN%';

-- 21005 - JUSTINDRAN Y
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 2000.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '21005' OR UPPER(name) LIKE '%JUSTINDRAN%';

-- 22002 - MIAH RASEL
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1500.00, default_mobile_allowance = 20.00, default_transport_allowance = 250.00, default_shift_allowance = 0.00
WHERE employee_code = '22002' OR UPPER(name) LIKE '%MIAH RASEL%';

-- 22003 - DEVENDIRAN SARAVANAKUMAR
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 902.22, default_mobile_allowance = 9.33, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '22003' OR UPPER(name) LIKE '%DEVENDIRAN SARAVANAKUMAR%';

-- 22004 - SAMIGOVINDHAN VIJAYAKUMAR
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1600.00, default_mobile_allowance = 20.00, default_transport_allowance = 100.00, default_shift_allowance = 0.00
WHERE employee_code = '22004' OR UPPER(name) LIKE '%SAMIGOVINDHAN VIJAYAKUMAR%';

-- 22006 - MOHAMMAD BILLAL
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1500.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '22006' OR UPPER(name) LIKE '%MOHAMMAD BILLAL%';

-- 22009 - KARUNAKARAN PERIYASAMY
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 2200.00, default_mobile_allowance = 20.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '22009' OR UPPER(name) LIKE '%KARUNAKARAN PERIYASAMY%';

-- 23003 - SELVARAJ SATHIYASEELAN
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1200.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '23003' OR UPPER(name) LIKE '%SELVARAJ SATHIYASEELAN%';

-- 23004 - KANNAN SURYAPRAKASH
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1700.00, default_mobile_allowance = 20.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '23004' OR UPPER(name) LIKE '%KANNAN SURYAPRAKASH%';

-- 23005 - GOH WEN DA
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 1087.50, default_mobile_allowance = 6.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '23005' OR UPPER(name) LIKE '%GOH WEN DA%';

-- 23006 - RAJA ARULKUMAR
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1100.00, default_mobile_allowance = 20.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '23006' OR UPPER(name) LIKE '%RAJA ARULKUMAR%';

-- 23010 - KATHIRVEL RAMASAMY
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1200.00, default_mobile_allowance = 20.00, default_transport_allowance = 100.00, default_shift_allowance = 0.00
WHERE employee_code = '23010' OR UPPER(name) LIKE '%KATHIRVEL RAMASAMY%';

-- 23011 - KISHANRAJ PANNIR SELVAM
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1600.00, default_mobile_allowance = 30.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '23011' OR UPPER(name) LIKE '%KISHANRAJ PANNIR SELVAM%';

-- 23012 - MARTIN NG SOO LEONG
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 4300.00, default_mobile_allowance = 30.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '23012' OR UPPER(name) LIKE '%MARTIN NG SOO LEONG%';

-- 23014 - MURUGAN SATHISHKUMAR
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1200.00, default_mobile_allowance = 20.00, default_transport_allowance = 240.00, default_shift_allowance = 0.00
WHERE employee_code = '23014' OR UPPER(name) LIKE '%MURUGAN SATHISHKUMAR%';

-- 23016 - LAVANIAH PUNNIYAMUTHY
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 2600.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '23016' OR UPPER(name) LIKE '%LAVANIAH PUNNIYAMUTHY%';

-- 23017 - ARUMUGAM BABU
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 757.78, default_mobile_allowance = 13.78, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '23017' OR UPPER(name) LIKE '%ARUMUGAM BABU%';

-- 23020 - MUTHUSAMY RAGAVAN
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1200.00, default_mobile_allowance = 20.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '23020' OR UPPER(name) LIKE '%MUTHUSAMY RAGAVAN%';

-- 24003 - LOGESH A/L VEJAYAKUMURAN
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 3300.00, default_mobile_allowance = 30.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '24003' OR UPPER(name) LIKE '%LOGESH%VEJAYAKUMURAN%';

-- 24004 - ABOOL FEDEBRIC MORIL
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 4550.00, default_mobile_allowance = 40.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '24004' OR UPPER(name) LIKE '%ABOOL FEDEBRIC MORIL%';

-- 24005 - NG ZHENG RONG
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 5000.00, default_mobile_allowance = 30.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '24005' OR UPPER(name) LIKE '%NG ZHENG RONG%';

-- 24007 - NIRHUMALAN GANGAN
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1800.00, default_mobile_allowance = 20.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '24007' OR UPPER(name) LIKE '%NIRHUMALAN GANGAN%';

-- 24008 - HOSSAIN ABIR
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1000.00, default_mobile_allowance = 20.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '24008' OR UPPER(name) LIKE '%HOSSAIN ABIR%';

-- 24014 - ALI MD ROMJAN
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1000.00, default_mobile_allowance = 20.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '24014' OR UPPER(name) LIKE '%ALI MD ROMJAN%';

-- 24016 - TRIE NOVIYANI BINTI KODIRON
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 3850.00, default_mobile_allowance = 30.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '24016' OR UPPER(name) LIKE '%TRIE NOVIYANI%';

-- 24020 - MOLLA FIROZ
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 2200.00, default_mobile_allowance = 30.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '24020' OR UPPER(name) LIKE '%MOLLA FIROZ%';

-- 24021 - KATHIRVEL DEVARAJ
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 488.89, default_mobile_allowance = 4.89, default_transport_allowance = 24.44, default_shift_allowance = 0.00
WHERE employee_code = '24021' OR UPPER(name) LIKE '%KATHIRVEL DEVARAJ%';

-- 24029 - NATARAJAN ARAVINDA KUMAR
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1800.00, default_mobile_allowance = 30.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '24029' OR UPPER(name) LIKE '%NATARAJAN ARAVINDA KUMAR%';

-- 24030 - GOVINDARAJ KOORI SELVAM
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1200.00, default_mobile_allowance = 20.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '24030' OR UPPER(name) LIKE '%GOVINDARAJ KOORI SELVAM%';

-- 24031 - TULASI DASS S/O JAYARAM GOVINDASAMY
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 4000.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '24031' OR UPPER(name) LIKE '%TULASI DASS%';

-- 25001 - SHIL SHAM SUNDAR
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1100.00, default_mobile_allowance = 20.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25001' OR UPPER(name) LIKE '%SHIL SHAM SUNDAR%';

-- 25002 - NAVENH PATMANATHAN MOHAN RAJ
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1100.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25002' OR UPPER(name) LIKE '%NAVENH PATMANATHAN%';

-- 25003 - OSMAN GONI MOHAMMAD
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1100.00, default_mobile_allowance = 20.00, default_transport_allowance = 100.00, default_shift_allowance = 0.00
WHERE employee_code = '25003' OR UPPER(name) LIKE '%OSMAN GONI MOHAMMAD%';

-- 25004 - PRABHAHARAN RAMASAMY
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 4000.00, default_mobile_allowance = 30.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25004' OR UPPER(name) LIKE '%PRABHAHARAN RAMASAMY%';

-- 25005 - RAVINDRAN SIVAPRAKASAM
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 10500.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25005' OR UPPER(name) LIKE '%RAVINDRAN SIVAPRAKASAM%';

-- 25006 - RAMACHANDRAN MOHAN DINESH KUMAR
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 5500.00, default_mobile_allowance = 40.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25006' OR UPPER(name) LIKE '%RAMACHANDRAN MOHAN DINESH KUMAR%';

-- 25007 - PRIYA DARSINI RAVI
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 800.00, default_mobile_allowance = 15.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25007' OR UPPER(name) LIKE '%PRIYA DARSINI RAVI%';

-- 25009 - NAZREENISHA D/O MAJID
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 5000.00, default_mobile_allowance = 40.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25009' OR UPPER(name) LIKE '%NAZREENISHA%MAJID%';

-- 25010 - GIRIDHARI RAMAMOORTHY
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 8500.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25010' OR UPPER(name) LIKE '%GIRIDHARI RAMAMOORTHY%';

-- 25011 - SHAGIV RAJ DAVID
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 3000.00, default_mobile_allowance = 30.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25011' OR UPPER(name) LIKE '%SHAGIV RAJ DAVID%';

-- 25012 - MUTHALIAPPAN KAILASANATHAN
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1200.00, default_mobile_allowance = 20.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25012' OR UPPER(name) LIKE '%MUTHALIAPPAN KAILASANATHAN%';

-- 25014 - SATHISKUMAR RAMA
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 1200.00, default_mobile_allowance = 0.00, default_transport_allowance = 300.00, default_shift_allowance = 0.00
WHERE employee_code = '25014' OR UPPER(name) LIKE '%SATHISKUMAR RAMA%';

-- 25015 - MOHAMED ALAUDEEN MOHAMED ASLAM
UPDATE users SET residency_status = NULL, basic_monthly_salary = 800.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25015' OR UPPER(name) LIKE '%MOHAMED ALAUDEEN MOHAMED ASLAM%';

-- 25016 - RANA
UPDATE users SET residency_status = NULL, basic_monthly_salary = 1200.00, default_mobile_allowance = 0.00, default_transport_allowance = 100.00, default_shift_allowance = 0.00
WHERE employee_code = '25016' OR UPPER(name) LIKE '%RANA%';

-- 25017 - FAITH JR. NEGAPATAN
UPDATE users SET residency_status = 'SPR', basic_monthly_salary = 4600.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25017' OR UPPER(name) LIKE '%FAITH%NEGAPATAN%';

-- 25018 - MUHAMMAD HAQQ ARSHAQ MUHAMMAD NUR HAZLI
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 600.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25018' OR UPPER(name) LIKE '%MUHAMMAD HAQQ ARSHAQ%';

-- 25019 - TAY SHANE
UPDATE users SET residency_status = 'SINGAPOREAN', basic_monthly_salary = 600.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25019' OR UPPER(name) LIKE '%TAY SHANE%';

-- 25020 - SAKTHIVEL MUTHULAKSHMI
UPDATE users SET residency_status = 'FOREIGNER', basic_monthly_salary = 3900.00, default_mobile_allowance = 0.00, default_transport_allowance = 0.00, default_shift_allowance = 0.00
WHERE employee_code = '25020' OR UPPER(name) LIKE '%SAKTHIVEL MUTHULAKSHMI%';
