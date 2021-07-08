import sqlite3, csv
from datetime import datetime

def conv_time_to_int(timestr):
    timestr = timestr.strip()
    try:
        t = datetime.strptime(timestr, "%H:%M:%S")
    except ValueError:
        return 24 * 3600
    else:
        return t.hour * 3600 + t.minute * 60 + t.second

con = sqlite3.connect("transit.db")

cur = con.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS trips (
    route_id INTEGER,
    trip_id INTEGER PRIMARY KEY,
    headsign TEXT
)
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS stops (
    trip_id INTEGER,
    arrival_time INTEGER,
    departure_time INTEGER,
    departure_time_s TEXT,
    stop_id INTEGER,
    stop_sequence INTEGER,
    pickup_type INTEGER,
    drop_off_type INTEGER,
    shape_dist_traveled REAL
)
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS stop_names (
    stop_id INTEGER,
    stop_name TEXT
)
""")
con.commit()

# Fill trips table
for row in csv.DictReader(open("gtfs/trips.txt", "r")):
    cur.execute("INSERT OR IGNORE INTO trips values (?, ?, ?)", (row["route_id"], row["trip_id"], row["trip_headsign"]))
# Fill stop times table
stop_times_values = []
for row in csv.DictReader(open("gtfs/stop_times.txt", "r")):
    row["arrival_time"] = conv_time_to_int(row["arrival_time"])
    row["departure_time_i"] = conv_time_to_int(row["departure_time"])
    stop_times_values.append((row["trip_id"],
                     row["arrival_time"],
                     row["departure_time_i"],
                     row["departure_time"],
                     row["stop_id"],
                     row["stop_sequence"],
                     row["pickup_type"],
                     row["drop_off_type"],
                     row["shape_dist_traveled"]))

print("Executing")
cur.executemany("INSERT OR IGNORE INTO stops values (?,?,?,?,?,?,?,?,?)",stop_times_values)
con.commit()