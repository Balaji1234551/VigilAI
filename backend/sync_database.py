import os
import sys
import logging
from sqlalchemy import create_engine, MetaData, Table
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("DBSync")

# Default Neon connection string provided by user
NEON_DATABASE_URL = os.getenv("NEON_DATABASE_URL", "postgresql://neondb_owner:npg_gaw6GTekbl5B@ep-small-water-ayuny9bo-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require")

# Default Local connection string (adjust to your local postgres credentials)
LOCAL_DATABASE_URL = os.getenv("LOCAL_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/vigilai_db")

def sync_databases():
    logger.info("Initializing Database Sync...")
    logger.info(f"Source (Cloud): {NEON_DATABASE_URL.split('@')[1]}")
    logger.info(f"Destination (Local): {LOCAL_DATABASE_URL.split('@')[1]}")

    try:
        source_engine = create_engine(NEON_DATABASE_URL)
        dest_engine = create_engine(LOCAL_DATABASE_URL)

        source_meta = MetaData()
        source_meta.reflect(bind=source_engine)
        
        dest_meta = MetaData()
        dest_meta.reflect(bind=dest_engine)

        source_conn = source_engine.connect()
        dest_conn = dest_engine.connect()

        # We will iterate over all tables and UPSERT records from Neon into Local
        tables_to_sync = ['users', 'cameras', 'alerts'] # Add other tables if needed

        for table_name in tables_to_sync:
            if table_name not in source_meta.tables or table_name not in dest_meta.tables:
                logger.warning(f"Skipping {table_name}: not found in one of the databases.")
                continue

            logger.info(f"Syncing table: {table_name}...")
            source_table = source_meta.tables[table_name]
            dest_table = dest_meta.tables[table_name]

            # Fetch all records from Neon
            records = source_conn.execute(source_table.select()).fetchall()
            if not records:
                logger.info(f"  No records found in {table_name}.")
                continue

            # Convert to list of dicts
            data_to_insert = [dict(zip(source_table.columns.keys(), row)) for row in records]
            
            # Upsert into local database
            stmt = insert(dest_table).values(data_to_insert)
            
            # We assume 'id' is the primary key for conflict resolution
            if 'id' in dest_table.columns:
                primary_keys = ['id']
                update_dict = {c.name: c for c in stmt.excluded if not c.primary_key}
                
                if update_dict:
                    stmt = stmt.on_conflict_do_update(
                        index_elements=primary_keys,
                        set_=update_dict
                    )
                else:
                    stmt = stmt.on_conflict_do_nothing(index_elements=primary_keys)
            else:
                stmt = stmt.on_conflict_do_nothing() # No PK, just ignore duplicates

            result = dest_conn.execute(stmt)
            dest_conn.commit()
            logger.info(f"  Successfully synced {len(data_to_insert)} records for {table_name}.")

        logger.info("Database sync completed successfully!")

    except Exception as e:
        logger.error(f"Error during synchronization: {e}")
    finally:
        if 'source_conn' in locals(): source_conn.close()
        if 'dest_conn' in locals(): dest_conn.close()

if __name__ == "__main__":
    sync_databases()
