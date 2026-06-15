import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'vigilai.db')
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN notification_preferences JSON")
        print("Successfully added notification_preferences to users table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column notification_preferences already exists.")
        else:
            print(f"Error: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
