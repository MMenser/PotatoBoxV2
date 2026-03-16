from flask import Flask, jsonify, request
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import os
import psycopg2
from datetime import timezone
import pytz
from dotenv import load_dotenv
from transciever import sendLoraMessage

load_dotenv()
app = Flask(__name__)
cors = CORS(app, origins='*')

# --- Scheduler setup ---
def check_schedules():
    now = datetime.now().strftime("%H:%M")
    conn = getDBConnection()
    cur = conn.cursor()
    cur.execute("SELECT box_id, delta FROM schedules WHERE time = %s", (now,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    for row in rows:
        box_id, delta = row
        content = 'D' + str(delta)
        sendLoraMessage(box_id, content)

scheduler = BackgroundScheduler()
scheduler.add_job(check_schedules, 'interval', minutes=1)
scheduler.start()

# --- Schedule routes ---
@app.route("/schedules/<int:box_id>", methods=['GET'])
def get_schedules(box_id):
    conn = getDBConnection()
    cur = conn.cursor()
    cur.execute("SELECT id, box_id, time, delta FROM schedules WHERE box_id = %s", (box_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([{"id": r[0], "box_id": r[1], "time": r[2], "delta": r[3]} for r in rows]), 200

@app.route("/schedules", methods=['POST'])
def create_schedule():
    data = request.json
    conn = getDBConnection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO schedules (box_id, time, delta) VALUES (%s, %s, %s) RETURNING id",
        (data['box_id'], data['time'], data['delta'])
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"id": new_id, "box_id": data['box_id'], "time": data['time'], "delta": data['delta']}), 201

@app.route("/schedules/<int:schedule_id>", methods=['DELETE'])
def delete_schedule(schedule_id):
    conn = getDBConnection()
    cur = conn.cursor()
    cur.execute("DELETE FROM schedules WHERE id = %s", (schedule_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"deleted": schedule_id}), 200

def getDBConnection():
    conn = psycopg2.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        database="potatodb",
        user=os.environ['DB_USERNAME'],
        password=os.environ['DB_PASSWORD'],
        connect_timeout=5)
    return conn


@app.route("/")
def hello():
    return "<h1 style='color:blue'>Hello There!</h1>"

@app.route("/changeDelta/<int:boxID>/<int:delta>", methods=['POST'])
def changeDelta(boxID, delta):
    if delta < 0 or delta > 30: # Delta can only be in range of 0-30
        return jsonify({"status": "error", "message": "Delta out of range"}), 400
    content = 'D' + str(delta)
    sendLoraMessage(boxID, content)
    return jsonify({"status": "sent"}), 200

@app.route("/getData/<int:boxID>/<int:limit>", methods=['GET'])
def getData(boxID, limit=10):
    print(f"BoxID: {boxID}, Limit: {limit}")
    conn = getDBConnection()
    cur = conn.cursor()
    if limit == 99:              
        cur.execute('SELECT * FROM _box WHERE _boxID = %s ORDER BY _timestamp DESC', ([boxID]))
    else:
        cur.execute('SELECT * FROM _box WHERE _boxID = %s ORDER BY _timestamp DESC LIMIT %s', (boxID, limit))
    rows = cur.fetchall()
    
    # Define PST timezone
    pst = pytz.timezone('America/Los_Angeles')
    
    data = []
    for row in rows:
        timestamp = row[10]
        
        # If timestamp is naive (no timezone), assume it's already in PST
        if timestamp.tzinfo is None:
            # Make it timezone-aware as PST
            timestamp = pst.localize(timestamp)
        
        # Convert to Unix timestamp (seconds since epoch)
        unix_timestamp = int(timestamp.timestamp())
        
        data.append({
            "_entryID": row[0],
            "_boxID": row[1],
            "_ambientTemperature": row[2],
            "_averageTemperature": row[3],
            "_delta": row[4],
            "_currentVoltage": row[5],
            "_sensor1": row[6],
            "_sensor2": row[7],
            "_sensor3": row[8],
            "_sensor4": row[9],
            "_timestamp": unix_timestamp  # Send as Unix timestamp
        })
    cur.close()
    conn.close()
    return jsonify(data), 200