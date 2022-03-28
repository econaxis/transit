import struct

import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.sql import text

from data_pb2 import StopPosition, ShapePosition, BusInfo, BusInfoCol

engine = create_engine("sqlite:///gtfs-ttc.db")


def interp_dist_time(df, x_name, y_name, time):
    for window in df.rolling(2):
        before = window.iloc[0][x_name]
        after = window.iloc[-1][x_name]
        if time < before:
            return df.iloc[0].y_name
        if before != after and before <= time <= after:
            before_dist = window.iloc[0][y_name]
            after_dist = window.iloc[-1][y_name]

            alpha = (time - before) / (after - before)

            return before_dist + alpha * (after_dist - before_dist)

    return df.iloc[-1][y_name]


def detect_ids(df, table_name: str) -> [str]:
    commands = []
    for col in df.columns:
        if col.endswith('_id'):
            commands.append(f"CREATE INDEX IF NOT EXISTS {col}_{table_name}_index ON {table_name} ({col})")
    print(commands)
    return commands


def load():
    tables = ["stops", "trips", "shapes", "routes"]
    tables = ["routes"]
    st = pd.read_csv("ttc/stop_times.txt")

    #     for i, row in st.iterrows():
    #         if i % 10000 == 0:
    #             print(i)
    #         time_secs = 0
    #         if row.arrival_time[0:2].isnumeric():
    #             num = int(row.arrival_time[0:2])
    #             if num >= 24:
    #                 row.arrival_time = f"{num - 24}{row.arrival_time[2:]}"
    #                 time_secs += 3600 * 24
    #         time = datetime.strptime(row.arrival_time, "%H:%M:%S")
    #         time_secs += time.hour * 3600 + time.minute * 60 + time.second
    #         st.at[i, 'arrival_time'] = time_secs
    #     st.arrival_time = st.arrival_time.astype('int64')
    #     st.drop('departure_time', axis=1, inplace=True)
    #
    #     st.to_sql("stop_times", engine, if_exists='append')
    #     for command in detect_ids(st, "stop_times"):
    #         engine.execute(command)

    for t in tables:
        table = pd.read_csv(f"ttc/{t}.txt")
        table.to_sql(t, engine, if_exists='append')
        for command in detect_ids(table, t):
            engine.execute(command)

    engine.execute("CREATE INDEX IF NOT EXISTS arrival_time_index ON stop_times (arrival_time)")


conn = engine.connect()


def get_shapes_list(temp_name):
    query = text(f"""
        SELECT sub.trip_id, shapes.shape_dist_traveled, shape_pt_lon, shape_pt_lat FROM shapes
            JOIN (SELECT DISTINCT trip_id, shape_id FROM {temp_name}) as sub
            ON shapes.shape_id = sub.shape_id
            WHERE shapes.shape_dist_traveled ORDER BY sub.trip_id, shapes.shape_dist_traveled;
    """)
    result = conn.execute(query).fetchall()

    return result


def get_active_trips(cur_time=11 * 3600, end_time=12 * 3600):
    temp_name = "temp_table_active_trips"
    conn.execute(f"DROP TABLE IF EXISTS {temp_name}")
    query = text(f"""
    CREATE TEMPORARY TABLE {temp_name} AS 
    SELECT trips.trip_id,stop_times.arrival_time,stop_times.stop_id,trips.shape_id,stop_times.shape_dist_traveled
        FROM trips JOIN stop_times ON trips.trip_id = stop_times.trip_id 
        WHERE stop_times.arrival_time >= :min AND stop_times.arrival_time <= :max
        AND stop_times.shape_dist_traveled IS NOT NULL ORDER BY trips.trip_id;
    """)
    conn.execute(
        query, {"min": cur_time, "max": end_time})
    result = conn.execute(f"SELECT * FROM {temp_name}").fetchall()
    return result, temp_name


def join_results(stop_times, shapes, writer):
    result = {}
    for i in stop_times:
        if i.trip_id not in result:
            result[i.trip_id] = BusInfo()
        result[i.trip_id].trip_id = i.trip_id
        stop = StopPosition()
        stop.stop_id = i.stop_id
        stop.stop_time = i.arrival_time
        stop.shape_dist_traveled = i.shape_dist_traveled
        result[i.trip_id].stops.append(stop)
    for i in shapes:
        shape = ShapePosition()
        shape.shape_dist_traveled = i.shape_dist_traveled
        shape.lat = i.shape_pt_lat
        shape.lon = i.shape_pt_lon
        result[i.trip_id].shapes.append(shape)

    col = BusInfoCol()
    for j in result.values():
        if len(col.bi) > 200:
            s = col.SerializeToString()
            length = struct.pack('<I', len(s))
            writer.write(length)
            writer.write(s)
            col = BusInfoCol()
        col.bi.append(j)
    s = col.SerializeToString()
    length = struct.pack('<I', len(s))
    writer.write(length)
    writer.write(s)


def get_trips():
    li = conn.execute("SELECT trip_id, route_id FROM trips").fetchall()
    result = {}
    for trip, route in li:
        result[trip] = route

    return result


def get_routes():
    li = conn.execute("SELECT route_id, route_short_name, route_long_name FROM routes").fetchall()
    result = {}
    for route, short, name in li:
        result[route] = str(short) + " " + name
    return result


def get_stops():
    li = conn.execute("SELECT stop_id, stop_name FROM stops").fetchall()
    result = {}
    for stop_id, name in li:
        result[stop_id] = name
    return result


# open("web1/trips.json", "w+").write(json.dumps(get_trips()))
# open("web1/routes.json", "w+").write(json.dumps(get_routes()))
# open("web1/stops.json", "w+").write(json.dumps(get_stops()))

for start in range(0, 23 * 3600, 1800):
    end = start + 1800
    result, temp_name = get_active_trips(start, end)
    result1 = get_shapes_list(temp_name)
    file = open(f"web1/{start}.data", "wb+")
    join_results(result, result1, file)
