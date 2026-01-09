-- FIXED QUERY: Uses OUTER APPLY to get only the FIRST GPS record per inspection
-- This prevents duplicate inspection records when multiple GPS points exist

SELECT 'POULTRY' as Commodity,
       DateOfInspection, StartOfInspection, EndOfInspection,
       InspectionLocationTypeID, IsDirectionPresentForthisInspection,
       InspectorId,
       gps.Latitude AS Latitude,
       gps.Longitude AS Longitude,
       NULL AS IsSampleTaken,
       NULL AS InspectionTravelDistanceKm,
       [AFS].[dbo].[PoultryQuidInspectionRecordTypes].Id as Id,
       clt.Name as Client,
       clt.InternalAccountNumber as InternalAccountNumber,
       [AFS].[dbo].[PoultryQuidInspectionRecordTypes].ProductName as ProductName
FROM AFS.dbo.PoultryQuidInspectionRecordTypes
OUTER APPLY (
    SELECT TOP 1 Latitude, Longitude
    FROM AFS.dbo.GPSInspectionLocationRecords
    WHERE PoultryQuidInspectionRecordId = [AFS].[dbo].PoultryQuidInspectionRecordTypes.Id
    ORDER BY Id  -- Take the first GPS record
) gps
JOIN AFS.dbo.Clients clt ON clt.Id = [AFS].[dbo].PoultryQuidInspectionRecordTypes.ClientId
WHERE AFS.dbo.PoultryQuidInspectionRecordTypes.IsActive = 1
  AND DateOfInspection >= '2025-10-01'
  AND DateOfInspection < '2026-04-01'
  AND [AFS].[dbo].[PoultryQuidInspectionRecordTypes].ProductName IS NOT NULL
  AND [AFS].[dbo].[PoultryQuidInspectionRecordTypes].ProductName != ''

UNION ALL

SELECT 'POULTRY' as Commodity,
       DateOfInspection, StartOfInspection, EndOfInspection,
       InspectionLocationTypeID, IsDirectionPresentForthisInspection,
       InspectorId,
       gps.Latitude AS Latitude,
       gps.Longitude AS Longitude,
       NULL AS IsSampleTaken,
       NULL AS InspectionTravelDistanceKm,
       [AFS].[dbo].[PoultryGradingInspectionRecordTypes].Id as Id,
       clt.Name as Client,
       clt.InternalAccountNumber as InternalAccountNumber,
       [AFS].[dbo].[PoultryGradingInspectionRecordTypes].ProductName as ProductName
FROM AFS.dbo.PoultryGradingInspectionRecordTypes
OUTER APPLY (
    SELECT TOP 1 Latitude, Longitude
    FROM AFS.dbo.GPSInspectionLocationRecords
    WHERE PoultryGradingClassInspectionRecordId = [AFS].[dbo].[PoultryGradingInspectionRecordTypes].Id
    ORDER BY Id  -- Take the first GPS record
) gps
JOIN AFS.dbo.Clients clt ON clt.Id = [AFS].[dbo].[PoultryGradingInspectionRecordTypes].ClientId
WHERE AFS.dbo.[PoultryGradingInspectionRecordTypes].IsActive = 1
  AND DateOfInspection >= '2025-10-01'
  AND DateOfInspection < '2026-04-01'
  AND [AFS].[dbo].[PoultryGradingInspectionRecordTypes].ProductName IS NOT NULL
  AND [AFS].[dbo].[PoultryGradingInspectionRecordTypes].ProductName != ''

UNION ALL

SELECT 'POULTRY' as Commodity,
       DateOfInspection, StartOfInspection, EndOfInspection,
       InspectionLocationTypeID, IsDirectionPresentForthisInspection,
       InspectorId,
       gps.Latitude AS Latitude,
       gps.Longitude AS Longitude,
       NULL AS IsSampleTaken,
       NULL AS InspectionTravelDistanceKm,
       [AFS].[dbo].[PoultryLabelInspectionChecklistRecords].Id as Id,
       clt.Name as Client,
       clt.InternalAccountNumber as InternalAccountNumber,
       [AFS].[dbo].[PoultryLabelInspectionChecklistRecords].ProductName as ProductName
FROM AFS.dbo.PoultryLabelInspectionChecklistRecords
OUTER APPLY (
    SELECT TOP 1 Latitude, Longitude
    FROM AFS.dbo.GPSInspectionLocationRecords
    WHERE PoultryLabelChecklistInspectionRecordId = [AFS].[dbo].[PoultryLabelInspectionChecklistRecords].Id
    ORDER BY Id  -- Take the first GPS record
) gps
JOIN AFS.dbo.Clients clt ON clt.Id = [AFS].[dbo].[PoultryLabelInspectionChecklistRecords].ClientId
WHERE AFS.dbo.[PoultryLabelInspectionChecklistRecords].IsActive = 1
  AND DateOfInspection >= '2025-10-01'
  AND DateOfInspection < '2026-04-01'
  AND [AFS].[dbo].[PoultryLabelInspectionChecklistRecords].ProductName IS NOT NULL
  AND [AFS].[dbo].[PoultryLabelInspectionChecklistRecords].ProductName != ''

UNION ALL

SELECT 'EGGS' as Commodity,
       DateOfInspection, StartOfInspection, EndOfInspection,
       InspectionLocationTypeID,
       IsDirectionPresentForInspection as IsDirectionPresentForthisInspection,
       InspectorId,
       gps.Latitude AS Latitude,
       gps.Longitude AS Longitude,
       NULL AS IsSampleTaken,
       NULL AS InspectionTravelDistanceKm,
       [AFS].[dbo].[PoultryEggInspectionRecords].Id as Id,
       clt.Name as Client,
       clt.InternalAccountNumber as InternalAccountNumber,
       [AFS].[dbo].[PoultryEggInspectionRecords].EggProducer as ProductName
FROM [AFS].[dbo].[PoultryEggInspectionRecords]
OUTER APPLY (
    SELECT TOP 1 Latitude, Longitude
    FROM AFS.dbo.GPSInspectionLocationRecords
    WHERE PoultryEggInspectionRecordId = [AFS].[dbo].[PoultryEggInspectionRecords].Id
    ORDER BY Id  -- Take the first GPS record
) gps
JOIN AFS.dbo.Clients clt ON clt.Id = [AFS].[dbo].[PoultryEggInspectionRecords].ClientId
WHERE AFS.dbo.[PoultryEggInspectionRecords].IsActive = 1
  AND DateOfInspection >= '2025-10-01'
  AND DateOfInspection < '2026-04-01'

UNION ALL

SELECT 'RAW' as Commodity,
       DateOfInspection, StartOfInspection, EndOfInspection,
       InspectionLocationTypeID, IsDirectionPresentForthisInspection,
       InspectorId,
       gps.Latitude AS Latitude,
       gps.Longitude AS Longitude,
       IsSampleTaken, NULL AS InspectionTravelDistanceKm,
       [AFS].[dbo].[RawRMPInspectionRecordTypes].Id as Id,
       clt.Name as Client,
       clt.InternalAccountNumber as InternalAccountNumber,
       prod.NewProductItemDetails as ProductName
FROM [AFS].[dbo].[RawRMPInspectionRecordTypes]
OUTER APPLY (
    SELECT TOP 1 Latitude, Longitude
    FROM AFS.dbo.GPSInspectionLocationRecords
    WHERE RawRMPInspectionRecordId = [AFS].[dbo].[RawRMPInspectionRecordTypes].Id
    ORDER BY Id  -- Take the first GPS record
) gps
JOIN AFS.dbo.RawRMPInspectedProductRecordTypes prod ON prod.InspectionId = [AFS].[dbo].[RawRMPInspectionRecordTypes].Id
JOIN AFS.dbo.Clients clt ON clt.Id = prod.ClientId
WHERE AFS.dbo.[RawRMPInspectionRecordTypes].IsActive = 1
  AND DateOfInspection >= '2025-10-01'
  AND DateOfInspection < '2026-04-01'
  AND prod.NewProductItemDetails IS NOT NULL
  AND prod.NewProductItemDetails != ''

UNION ALL

SELECT 'PMP' as Commodity,
       DateOfInspection, StartOfInspection, EndOfInspection,
       InspectionLocationTypeID, IsDirectionPresentForthisInspection,
       InspectorId,
       gps.Latitude AS Latitude,
       gps.Longitude AS Longitude,
       IsSampleTaken,
       NULL AS InspectionTravelDistanceKm,
       [AFS].[dbo].[PMPInspectionRecordTypes].Id as Id,
       clt.Name as Client,
       clt.InternalAccountNumber as InternalAccountNumber,
       prod.PMPItemDetails as ProductName
FROM [AFS].[dbo].[PMPInspectionRecordTypes]
OUTER APPLY (
    SELECT TOP 1 Latitude, Longitude
    FROM AFS.dbo.GPSInspectionLocationRecords
    WHERE PMPInspectionRecordId = [AFS].[dbo].[PMPInspectionRecordTypes].Id
    ORDER BY Id  -- Take the first GPS record
) gps
JOIN AFS.dbo.PMPInspectedProductRecordTypes prod ON prod.InspectionId = [AFS].[dbo].[PMPInspectionRecordTypes].Id
JOIN AFS.dbo.Clients clt ON clt.Id = prod.ClientId
WHERE AFS.dbo.[PMPInspectionRecordTypes].IsActive = 1
  AND DateOfInspection >= '2025-10-01'
  AND DateOfInspection < '2026-04-01'
  AND prod.PMPItemDetails IS NOT NULL
  AND prod.PMPItemDetails != ''
