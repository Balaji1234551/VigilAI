import psycopg2

passwords = ["npg_sxC5EHpQn4Na", "K Balu123", "KBalu123"]
base_url = "ep-morning-star-apj1q5gv.c-7.us-east-1.aws.neon.tech"

for pwd in passwords:
    try:
        print(f"Testing password: '{pwd}'...")
        conn = psycopg2.connect(
            host=base_url,
            database="neondb",
            user="neondb_owner",
            password=pwd,
            sslmode="require"
        )
        print(f"SUCCESS! Connected successfully with password: '{pwd}'")
        conn.close()
        break
    except Exception as e:
        print(f"FAILED for '{pwd}': {e}")
