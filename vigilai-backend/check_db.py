import sqlite3
import os

try:
    conn = sqlite3.connect('C:/Users/kurub/OneDrive/Desktop/Vigilai/vigilai-backend/vigilai.db')
    users = conn.execute('SELECT id, email FROM users').fetchall()
    cameras = conn.execute('SELECT id, user_id, name, url, status FROM cameras').fetchall()
    print("Users:", users)
    print("Cameras:", cameras)
except Exception as e:
    print("Error:", e)
