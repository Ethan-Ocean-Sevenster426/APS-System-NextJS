-- Server: 102.67.140.12, Port: 1053
-- Database: NAHDIS_FSA

-- =============================================
-- 1. Show ALL tables in the database
-- =============================================
USE NAHDIS_FSA;
GO

SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
ORDER BY TABLE_SCHEMA, TABLE_NAME;
GO

-- =============================================
-- 2. Schedule8Data - FormData with FormDataItems
-- =============================================
SELECT
    fd.[FRMD_Id]
    ,[ORG_Name] AS 'AbattoirName'
    ,[FRMD_Status]
    ,[FRMD_StartDate]
    ,[FRMD_EndDate]
    ,[FRMD_UserName] AS 'DataSubmitter'
    ,[FRMD_AprrovedUserName] AS 'FormApprover'
    ,[FRMD_ApprovedDate] AS 'DateApproved'
    ,fdi.GRP_Name AS 'DefectGroup'
    ,fdi.FDI_Item AS 'GroupItem'
    ,fdi.FDI_Value AS 'Value'
    ,fdi.FDI_Specie AS 'Specie'
FROM [Schedule8Data].[dbo].[FormData] fd
JOIN Schedule8Data.dbo.FormDataItems fdi ON fdi.FRMD_ID = fd.FRMD_Id
WHERE fd.FRMD_StartDate >= '2023-01-01';
GO
