"""
Helper script to connect to PostgreSQL, create the vigilai_db database
if it doesn't exist, save the configuration in .env, and seed the tables.
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Ensure backend directory is in python path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

COMMON_PASSWORDS = ["postgres", "", "admin", "root", "1234", "password"]
DB_HOST = "localhost"
DB_PORT = "5432"
DB_USER = "postgres"
DB_NAME = "vigilai_db"


def try_connect():
    """Try to connect to the default postgres database to find the working password."""
    from dotenv import load_dotenv
    load_dotenv()
    working_password = None
    connection = None
    
    # First, check if there is an existing .env password we can try
    env_password = os.getenv("DB_PASSWORD")
    passwords_to_try = list(COMMON_PASSWORDS)
    if env_password and env_password not in passwords_to_try:
        passwords_to_try.insert(0, env_password)

    print("Attempting to connect to local PostgreSQL...")
    for pwd in passwords_to_try:
        try:
            connection = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                user=DB_USER,
                password=pwd,
                database="postgres"
            )
            working_password = pwd
            print(f"[SUCCESS] Successfully connected to PostgreSQL using user '{DB_USER}' and password '{'*' * len(pwd) if pwd else '<empty>'}'!")
            break
        except Exception:
            continue

    if not connection:
        print("[ERROR] Could not connect to PostgreSQL using common passwords.")
        print("Please specify your local PostgreSQL password when prompted or write it directly to backend/.env")
        return None, None

    return connection, working_password


def create_database_if_not_exists(conn):
    """Create the vigilai_db database if it does not exist."""
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if vigilai_db exists
    cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}'")
    exists = cursor.fetchone()
    
    if not exists:
        print(f"Creating database '{DB_NAME}'...")
        cursor.execute(f"CREATE DATABASE {DB_NAME}")
        print(f"[SUCCESS] Database '{DB_NAME}' created successfully!")
    else:
        print(f"Database '{DB_NAME}' already exists.")
        
    cursor.close()


def write_env_file(password):
    """Create .env file based on successful configuration."""
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '.env'))
    
    # Load .env.example contents
    example_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '.env.example'))
    with open(example_path, 'r') as f:
        content = f.read()

    # Replace DB_PASSWORD placeholder with working password
    content = content.replace("DB_PASSWORD=your_secure_password_here", f"DB_PASSWORD={password}")
    
    # Write .env file
    with open(env_path, 'w') as f:
        f.write(content)
    print(f"[SUCCESS] Created '.env' file configured with working database password.")


def main():
    conn, pwd = try_connect()
    if not conn:
        # Prompt user to input password
        pwd = input("Enter your PostgreSQL password: ")
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                user=DB_USER,
                password=pwd,
                database="postgres"
            )
            print("[SUCCESS] Successfully connected with provided password!")
        except Exception as e:
            print(f"[ERROR] Failed to connect with provided password: {e}")
            sys.exit(1)

    create_database_if_not_exists(conn)
    conn.close()
    
    write_env_file(pwd)
    
    # Now trigger database seeding
    print("Initializing schemas and seeding mock data...")
    import seed_data
    seed_data.seed_database()
    print("[SUCCESS] All 11 tables created and seeded successfully in PostgreSQL!")


if __name__ == "__main__":
    main()
