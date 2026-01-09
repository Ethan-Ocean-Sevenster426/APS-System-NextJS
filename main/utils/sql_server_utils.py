"""
SQL Server utilities for fetching product names and other data
Uses pymssql - NO ODBC DRIVERS NEEDED!
"""

import pymssql
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class SQLServerConnection:
    """Utility class for connecting to SQL Server using pymssql (NO ODBC DRIVERS!)"""

    def __init__(self):
        self.sql_server_config = settings.DATABASES.get('sql_server', {})
        self.connection = None

    def connect(self):
        """Establish connection to SQL Server using pymssql"""
        try:
            self.connection = pymssql.connect(
                server=self.sql_server_config.get('HOST'),
                port=int(self.sql_server_config.get('PORT', 1433)),
                user=self.sql_server_config.get('USER'),
                password=self.sql_server_config.get('PASSWORD'),
                database=self.sql_server_config.get('NAME'),
                timeout=10
            )
            return True
        except Exception as e:
            logger.error(f"Failed to connect to SQL Server: {e}")
            return False

    def disconnect(self):
        """Close SQL Server connection"""
        if self.connection:
            self.connection.close()
            self.connection = None

    def get_product_names_by_inspection_id(self, inspection_id):
        """
        Fetch product names for a specific inspection ID from SQL Server
        Returns a list of product names found in various tables
        """
        if not self.connection:
            if not self.connect():
                return []

        product_names = []

        try:
            cursor = self.connection.cursor()

            # Query PMP (Processed Meat Products) table - only get actual product names
            pmp_query = """
                SELECT PMPItemDetails
                FROM PMPInspectedProductRecordTypes
                WHERE InspectionId = %s AND PMPItemDetails IS NOT NULL AND PMPItemDetails != ''
            """
            cursor.execute(pmp_query, (inspection_id,))
            pmp_results = cursor.fetchall()

            for row in pmp_results:
                if row[0] and row[0].strip():  # Only PMPItemDetails (actual product name)
                    product_names.append(row[0].strip())

            # Query Poultry tables - only get actual product names
            poultry_queries = [
                "SELECT ProductName FROM PoultryGradingInspectionRecordTypes WHERE Id = %s AND ProductName IS NOT NULL AND ProductName != ''",
                "SELECT ProductName FROM PoultryLabelInspectionChecklistRecords WHERE Id = %s AND ProductName IS NOT NULL AND ProductName != ''",
                "SELECT ProductName FROM PoultryQuidInspectionRecordTypes WHERE Id = %s AND ProductName IS NOT NULL AND ProductName != ''",
                "SELECT ProductName FROM PoultryInspectionRecordTypes WHERE Id = %s AND ProductName IS NOT NULL AND ProductName != ''"
            ]

            for query in poultry_queries:
                try:
                    cursor.execute(query, (inspection_id,))
                    results = cursor.fetchall()
                    for row in results:
                        if row[0] and row[0].strip():
                            product_names.append(row[0].strip())
                except Exception as e:
                    # Table might not exist or have different structure
                    logger.debug(f"Query failed (expected): {e}")
                    continue

            # Query Raw RMP table - only get actual product names
            raw_rmp_query = """
                SELECT NewProductItemDetails
                FROM RawRMPInspectedProductRecordTypes
                WHERE InspectionId = %s AND NewProductItemDetails IS NOT NULL AND NewProductItemDetails != ''
            """
            cursor.execute(raw_rmp_query, (inspection_id,))
            raw_rmp_results = cursor.fetchall()

            for row in raw_rmp_results:
                if row[0] and row[0].strip():  # Only NewProductItemDetails (actual product name)
                    product_names.append(row[0].strip())

            # Query Egg Products (PoultryEggInspectionRecords)
            # Generate product name from EggProducer + SizeId + GradeId
            SIZE_MAP = {
                1: 'Jumbo',
                2: 'Extra Large',
                3: 'Large',
                4: 'Medium',
                5: 'Small',
                6: 'Peewee'
            }

            GRADE_MAP = {
                1: 'Grade A',
                2: 'Grade B',
                3: 'Grade C'
            }

            egg_query = """
                SELECT EggProducer, SizeId, GradeId
                FROM PoultryEggInspectionRecords
                WHERE Id = %s AND SizeId IS NOT NULL AND GradeId IS NOT NULL
            """
            cursor.execute(egg_query, (inspection_id,))
            egg_results = cursor.fetchall()

            for row in egg_results:
                egg_producer, size_id, grade_id = row
                # Generate product name from EggProducer + Size + Grade
                size_name = SIZE_MAP.get(size_id, f'Size {size_id}')
                grade_name = GRADE_MAP.get(grade_id, f'Grade {grade_id}')

                # Include brand name if available
                if egg_producer and egg_producer.strip():
                    product_name = f'{egg_producer.strip()} {size_name} Eggs'
                else:
                    product_name = f'{size_name} {grade_name} Eggs'

                product_names.append(product_name)

            # Remove duplicates and empty strings
            product_names = list(set([name.strip() for name in product_names if name and name.strip()]))

            logger.info(f"Found {len(product_names)} product names for inspection {inspection_id}: {product_names}")
            return product_names

        except Exception as e:
            logger.error(f"Error fetching product names for inspection {inspection_id}: {e}")
            return []

    def get_product_names_by_client_and_date(self, client_name, inspection_date):
        """
        Fetch product names for a client on a specific date
        This is useful when we have client name and date but not specific inspection ID
        """
        if not self.connection:
            if not self.connect():
                return []

        product_names = []

        try:
            cursor = self.connection.cursor()

            # Query PMP table by client and date - only get actual product names
            pmp_query = """
                SELECT p.PMPItemDetails
                FROM PMPInspectedProductRecordTypes p
                INNER JOIN PMPInspectionRecordTypes i ON p.InspectionId = i.Id
                WHERE i.ClientName = %s AND CAST(i.DateOfInspection AS DATE) = %s
                AND p.PMPItemDetails IS NOT NULL AND p.PMPItemDetails != ''
            """
            cursor.execute(pmp_query, (client_name, inspection_date))
            pmp_results = cursor.fetchall()

            for row in pmp_results:
                if row[0] and row[0].strip():  # Only PMPItemDetails (actual product name)
                    product_names.append(row[0].strip())

            # Query Poultry tables by client and date - only get actual product names
            poultry_queries = [
                """
                SELECT ProductName FROM PoultryGradingInspectionRecordTypes
                WHERE ClientName = %s AND CAST(DateOfInspection AS DATE) = %s
                AND ProductName IS NOT NULL AND ProductName != ''
                """,
                """
                SELECT ProductName FROM PoultryLabelInspectionChecklistRecords
                WHERE ClientName = %s AND CAST(DateOfInspection AS DATE) = %s
                AND ProductName IS NOT NULL AND ProductName != ''
                """,
                """
                SELECT ProductName FROM PoultryQuidInspectionRecordTypes
                WHERE ClientName = %s AND CAST(DateOfInspection AS DATE) = %s
                AND ProductName IS NOT NULL AND ProductName != ''
                """
            ]

            for query in poultry_queries:
                try:
                    cursor.execute(query, (client_name, inspection_date))
                    results = cursor.fetchall()
                    for row in results:
                        if row[0] and row[0].strip():
                            product_names.append(row[0].strip())
                except Exception as e:
                    logger.debug(f"Poultry query failed (expected): {e}")
                    continue

            # Query Raw RMP table by client and date - only get actual product names
            raw_rmp_query = """
                SELECT p.NewProductItemDetails
                FROM RawRMPInspectedProductRecordTypes p
                INNER JOIN RawRMPInspectionRecordTypes i ON p.InspectionId = i.Id
                WHERE i.ClientName = %s AND CAST(i.DateOfInspection AS DATE) = %s
                AND p.NewProductItemDetails IS NOT NULL AND p.NewProductItemDetails != ''
            """
            cursor.execute(raw_rmp_query, (client_name, inspection_date))
            raw_rmp_results = cursor.fetchall()

            for row in raw_rmp_results:
                if row[0] and row[0].strip():  # Only NewProductItemDetails (actual product name)
                    product_names.append(row[0].strip())

            # Query Egg Products by client and date
            # Generate product name from EggProducer + SizeId + GradeId
            SIZE_MAP = {
                1: 'Jumbo',
                2: 'Extra Large',
                3: 'Large',
                4: 'Medium',
                5: 'Small',
                6: 'Peewee'
            }

            GRADE_MAP = {
                1: 'Grade A',
                2: 'Grade B',
                3: 'Grade C'
            }

            # Note: PoultryEggInspectionRecords may not have ClientName field
            # We search by date only
            try:
                egg_query = """
                    SELECT EggProducer, SizeId, GradeId
                    FROM PoultryEggInspectionRecords
                    WHERE CAST(DateOfInspection AS DATE) = %s
                    AND SizeId IS NOT NULL AND GradeId IS NOT NULL
                """
                cursor.execute(egg_query, (inspection_date,))
                egg_results = cursor.fetchall()

                for row in egg_results:
                    egg_producer, size_id, grade_id = row
                    # Generate product name from EggProducer + Size + Grade
                    size_name = SIZE_MAP.get(size_id, f'Size {size_id}')
                    grade_name = GRADE_MAP.get(grade_id, f'Grade {grade_id}')

                    # Include brand name if available
                    if egg_producer and egg_producer.strip():
                        product_name = f'{egg_producer.strip()} {size_name} Eggs'
                    else:
                        product_name = f'{size_name} {grade_name} Eggs'

                    product_names.append(product_name)
            except Exception as e:
                logger.debug(f"Egg query by date failed: {e}")

            # Remove duplicates and empty strings
            product_names = list(set([name.strip() for name in product_names if name and name.strip()]))

            logger.info(f"Found {len(product_names)} product names for {client_name} on {inspection_date}: {product_names}")
            return product_names

        except Exception as e:
            logger.error(f"Error fetching product names for {client_name} on {inspection_date}: {e}")
            return []

def fetch_product_names_for_inspection(inspection_id=None, client_name=None, inspection_date=None):
    """
    Main function to fetch product names from SQL Server
    Can be called with either inspection_id or client_name + inspection_date
    Uses pymssql - NO ODBC DRIVERS NEEDED!
    """
    sql_conn = SQLServerConnection()

    try:
        if inspection_id:
            return sql_conn.get_product_names_by_inspection_id(inspection_id)
        elif client_name and inspection_date:
            return sql_conn.get_product_names_by_client_and_date(client_name, inspection_date)
        else:
            logger.error("Either inspection_id or (client_name + inspection_date) must be provided")
            return []
    finally:
        sql_conn.disconnect()


def fetch_all_product_names_bulk(inspection_ids):
    """
    OPTIMIZED: Fetch product names for ALL inspections in BULK
    Instead of 2,268 connections × 6 queries = ~13,600 queries
    This does 1 connection × 6 queries = 6 queries total!

    Args:
        inspection_ids: List of inspection IDs

    Returns:
        dict: {inspection_id: [product_name1, product_name2, ...]}
    """
    if not inspection_ids:
        return {}

    sql_conn = SQLServerConnection()
    if not sql_conn.connect():
        logger.error("Failed to connect to SQL Server for bulk product fetch")
        return {}

    product_map = {iid: [] for iid in inspection_ids}

    try:
        cursor = sql_conn.connection.cursor()

        # Convert inspection IDs to comma-separated string for SQL IN clause
        # Need to batch if too many IDs (SQL Server has limit of ~2100 parameters)
        batch_size = 2000

        for i in range(0, len(inspection_ids), batch_size):
            batch_ids = inspection_ids[i:i + batch_size]
            ids_str = ','.join(str(iid) for iid in batch_ids)

            print(f"   📦 Fetching products for inspection IDs {i} to {i+len(batch_ids)}...")

            # Query 1: PMP (Processed Meat Products) table
            try:
                pmp_query = f"""
                    SELECT InspectionId, PMPItemDetails
                    FROM PMPInspectedProductRecordTypes
                    WHERE InspectionId IN ({ids_str})
                    AND PMPItemDetails IS NOT NULL
                    AND PMPItemDetails != ''
                """
                cursor.execute(pmp_query)
                pmp_results = cursor.fetchall()

                for row in pmp_results:
                    inspection_id, product_name = row
                    if product_name and product_name.strip():
                        if inspection_id in product_map:
                            product_map[inspection_id].append(product_name.strip())

                print(f"      ✅ PMP table: {len(pmp_results)} products found")
            except Exception as e:
                logger.error(f"PMP bulk query failed: {e}")

            # Query 2-5: Poultry tables
            poultry_tables = [
                'PoultryGradingInspectionRecordTypes',
                'PoultryLabelInspectionChecklistRecords',
                'PoultryQuidInspectionRecordTypes',
                'PoultryInspectionRecordTypes'
            ]

            for table in poultry_tables:
                try:
                    poultry_query = f"""
                        SELECT Id, ProductName
                        FROM {table}
                        WHERE Id IN ({ids_str})
                        AND ProductName IS NOT NULL
                        AND ProductName != ''
                    """
                    cursor.execute(poultry_query)
                    poultry_results = cursor.fetchall()

                    for row in poultry_results:
                        inspection_id, product_name = row
                        if product_name and product_name.strip():
                            if inspection_id in product_map:
                                product_map[inspection_id].append(product_name.strip())

                    if poultry_results:
                        print(f"      ✅ {table}: {len(poultry_results)} products found")
                except Exception as e:
                    # Table might not exist or have different structure - that's okay
                    logger.debug(f"{table} query failed (expected): {e}")

            # Query 6: Raw RMP table
            try:
                raw_rmp_query = f"""
                    SELECT InspectionId, NewProductItemDetails
                    FROM RawRMPInspectedProductRecordTypes
                    WHERE InspectionId IN ({ids_str})
                    AND NewProductItemDetails IS NOT NULL
                    AND NewProductItemDetails != ''
                """
                cursor.execute(raw_rmp_query)
                raw_rmp_results = cursor.fetchall()

                for row in raw_rmp_results:
                    inspection_id, product_name = row
                    if product_name and product_name.strip():
                        if inspection_id in product_map:
                            product_map[inspection_id].append(product_name.strip())

                print(f"      ✅ Raw RMP table: {len(raw_rmp_results)} products found")
            except Exception as e:
                logger.error(f"Raw RMP bulk query failed: {e}")

            # Query 7: Egg Products (PoultryEggInspectionRecords)
            # Generate product name from EggProducer + SizeId + GradeId
            try:
                # Size and Grade mappings
                SIZE_MAP = {
                    1: 'Jumbo',
                    2: 'Extra Large',
                    3: 'Large',
                    4: 'Medium',
                    5: 'Small',
                    6: 'Peewee'
                }

                GRADE_MAP = {
                    1: 'Grade A',
                    2: 'Grade B',
                    3: 'Grade C'
                }

                egg_query = f"""
                    SELECT Id, EggProducer, SizeId, GradeId
                    FROM PoultryEggInspectionRecords
                    WHERE Id IN ({ids_str})
                    AND SizeId IS NOT NULL
                    AND GradeId IS NOT NULL
                """
                cursor.execute(egg_query)
                egg_results = cursor.fetchall()

                for row in egg_results:
                    inspection_id, egg_producer, size_id, grade_id = row
                    # Generate product name from EggProducer + Size + Grade
                    size_name = SIZE_MAP.get(size_id, f'Size {size_id}')
                    grade_name = GRADE_MAP.get(grade_id, f'Grade {grade_id}')

                    # Include brand name if available
                    if egg_producer and egg_producer.strip():
                        product_name = f'{egg_producer.strip()} {size_name} Eggs'
                    else:
                        product_name = f'{size_name} {grade_name} Eggs'

                    if inspection_id in product_map:
                        product_map[inspection_id].append(product_name)

                print(f"      ✅ Egg Products table: {len(egg_results)} products found")
            except Exception as e:
                logger.error(f"Egg Products bulk query failed: {e}")

        # Remove duplicates for each inspection
        for inspection_id in product_map:
            product_map[inspection_id] = list(set(product_map[inspection_id]))

        total_products = sum(len(products) for products in product_map.values())
        inspections_with_products = sum(1 for products in product_map.values() if products)

        print(f"\n   📊 Bulk Product Fetch Complete:")
        print(f"      - Total products found: {total_products}")
        print(f"      - Inspections with products: {inspections_with_products}/{len(inspection_ids)}")

        return product_map

    except Exception as e:
        logger.error(f"Error in bulk product fetch: {e}")
        return {}
    finally:
        sql_conn.disconnect()
