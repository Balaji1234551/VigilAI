from database.db import engine
from sqlalchemy import text

def fix_schema():
    with engine.connect() as conn:
        try:
            conn.execute(text('ALTER TABLE users ADD COLUMN name VARCHAR DEFAULT \'admin\''))
            print("Added name column to users")
        except Exception as e:
            print(f"Name column exists or error: {e}")
            
        try:
            conn.execute(text('ALTER TABLE users ADD COLUMN plan VARCHAR DEFAULT \'free\''))
            print("Added plan column to users")
        except Exception as e:
            print(f"Plan column exists or error: {e}")
            
        try:
            conn.execute(text('ALTER TABLE users ADD COLUMN fcm_token VARCHAR'))
            print("Added fcm_token column to users")
        except Exception as e:
            print(f"fcm_token column exists or error: {e}")

        try:
            conn.execute(text('ALTER TABLE users ADD COLUMN notification_preferences JSON'))
            print("Added notification_preferences column to users")
        except Exception as e:
            print(f"notification_preferences column exists or error: {e}")

        try:
            conn.execute(text('ALTER TABLE users ADD COLUMN last_login TIMESTAMP'))
            print("Added last_login column to users")
        except Exception as e:
            print(f"last_login column exists or error: {e}")
        
        conn.commit()

if __name__ == "__main__":
    fix_schema()
