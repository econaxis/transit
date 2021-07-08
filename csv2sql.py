import pyodbc, csv
from datetime import datetime


def conv_time_to_int(timestr):
    timestr = timestr.strip()
    try:
        t = datetime.strptime(timestr, "%H:%M:%S")
    except ValueError:
        return 24 * 3600
    else:
        return t.hour * 3600 + t.minute * 60 + t.second


sqlconn = pyodbc.connect(
    "Driver={ODBC Driver 17 for SQL Server};Server=tcp:translink-transit.database.windows.net,1433;Database=transit;Uid=martinliu24;Pwd=LakxXp46LHCvTTL$;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;")
cur = sqlconn.cursor()
cur.fast_executemany = True

if not cur.tables(table='trips', tableType='TABLE').fetchone():
    cur.execute("""
CREATE TABLE  trips (
    route_id INTEGER,
    trip_id INTEGER PRIMARY KEY,
    headsign VARCHAR(100),
     INDEX tripsindex UNIQUE (route_id, trip_id) INCLUDE (headsign)
)
""")

if not cur.tables(table='stops', tableType='TABLE').fetchone():
    cur.execute("""
CREATE TABLE  stops (
    trip_id INTEGER,
    arrival_time INTEGER,
    departure_time INTEGER,
    departure_time_s VARCHAR(20),
    stop_id INTEGER,
    stop_sequence INTEGER,
    pickup_type INTEGER,
    drop_off_type INTEGER,
    shape_dist_traveled REAL,
     INDEX stopsindex UNIQUE (trip_id, stop_id)
)
""")

sqlconn.commit()

# Fill stop times table
stop_times_values = []
for row in csv.DictReader(open("gtfs/stop_times.txt", "r")):
    row["arrival_time"] = conv_time_to_int(row["arrival_time"])
    row["departure_time_i"] = conv_time_to_int(row["departure_time"])

    if row["shape_dist_traveled"] == '':
        row["shape_dist_traveled"] = 0
    stop_times_values.append((row["trip_id"],
                              row["arrival_time"],
                              row["departure_time_i"],
                              row["departure_time"],
                              row["stop_id"],
                              row["stop_sequence"],
                              row["pickup_type"],
                              row["drop_off_type"],
                              row["shape_dist_traveled"]))

    if len(stop_times_values) > 100000:
        print("Executing")
        cur.executemany("INSERT INTO stops values (?,?,?,?,?,?,?,?,?)", stop_times_values)
        stop_times_values.clear()

trips_values = []
# Fill trips table
for row in csv.DictReader(open("gtfs/trips.txt", "r")):
    trips_values.append((row["route_id"], row["trip_id"], row["trip_headsign"]))

cur.executemany("INSERT INTO trips values (?, ?, ?)", trips_values)



sqlconn.commit()
