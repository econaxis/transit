import json
import flask
import redis
from flask import request
from flask_cors import CORS
import psycopg2
import pyodbc
import psycopg2.extras
from datetime import datetime

sqlconn = psycopg2.connect(host="henry-80q7.local", user="transit", dbname="transit", password="transit")
# sqlconn = pyodbc.connect(
#     "Driver={ODBC Driver 17 for SQL Server};Server=tcp:translink-transit.database.windows.net,1433;Database=transit;Uid=martinliu24;Pwd=LakxXp46LHCvTTL$;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;")
cur = sqlconn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor)

redis = redis.StrictRedis(host="redis-18070.c53.west-us.azure.cloud.redislabs.com", port=18070,
                          password="nhWkkCADbwbFrLG9dVjFzPOqCWcQJ6LZ")

app = flask.Flask(__name__)
CORS(app)


def parse_realtime_pos_to_response(result):
    resultstr = json.dumps([dict(
        vehicle_id=x.vehicle_id, latitude=x.latitude, longitude=x.longitude, timestamp=x.timestamp, trip_id=x.trip_id,
        cur_stop_sequence=x.cur_stop_sequence, route_id=x.route_id
    ) for x in result])

    return flask.Response(resultstr, headers=[("Content-Type", "application/json")])


@app.route("/positions-updates")
def positions_updates():
    query = """
select * from (
              select update_iteration from realtime ORDER BY update_iteration desc
                  ) maxtime INNER JOIN realtime ON maxtime.update_iteration = realtime.update_iteration LIMIT 1
    """
    cur.execute(query)
    result = cur.fetchall()
    return parse_realtime_pos_to_response(result)


@app.route("/positions")
def positions():
    cutofftime = request.args.get("last-timestamp", datetime.now().timestamp() - 3600)

    query = """
    select distinct realtime.vehicle_id, latitude, longitude, timestamp, trip_id, cur_stop_sequence, realtime.route_id
from realtime
         inner join
     (select max(timestamp) as maxtimestamp, vehicle_id
      from realtime
      where timestamp > ?
      group by vehicle_id) as temp
     on temp.vehicle_id = realtime.vehicle_id and temp.maxtimestamp = realtime.timestamp
    """

    cur.execute(query, cutofftime)
    result = cur.fetchall()
    return parse_realtime_pos_to_response(result)


@app.route("/headsigns")
def headsigns():
    cur.execute("""
    select * from headsigns
    """)
    result = cur.fetchall()

    resultdict = {y.route_id: (y.routenumber, y.headsign) for y in result}
    return flask.Response(json.dumps(resultdict), headers=[("Content-Type", "application/json")])


@app.route("/history")
def history():
    cur = sqlconn.cursor()
    vehicleid = request.args.get("vehicleid")

    cur.execute("""
        with maxtripid (trip_id, vehicle_id) as
            (select TOP 1 trip_id, vehicle_id from realtime where vehicle_id=? ORDER BY realtime.timestamp DESC)
        
        select DISTINCT timestamp, * from realtime
        inner join maxtripid
        on maxtripid.trip_id = realtime.trip_id and maxtripid.vehicle_id=realtime.vehicle_id
        ORDER BY realtime.timestamp DESC
    """, vehicleid)

    result = cur.fetchall()

    resultdict = [dict(timestamp=y.timestamp, latitude=y.latitude, longitude=y.longitude) for y in result]
    return flask.Response(json.dumps(resultdict), headers=[("Content-Type", "application/json")])


@app.route("/velocities")
def velocities():
    """
    TODO: implement filtering based on vehicle ids
    Returns the velocities of all vehicles.
    """
    cutofftime = request.args.get("last-timestamp", datetime.now().timestamp() - 3600)

    query = """
        with realtime_top2(latitude, longitude, vehicle_id, timestamp) as (select latitude, longitude, vehicle_id, timestamp
                                                            FROM (select DISTINCT timestamp,
                                                                         latitude,
                                                                         longitude,
                                                                         vehicle_id,
                                                                         ROW_NUMBER() over (PARTITION BY vehicle_id ORDER BY timestamp DESC) as rownumber
                                                                  from realtime
                                                                  WHERE timestamp > ?) all_rows
                                                            WHERE rownumber <= 2)
    select *
    from (
             select latitude - LAG(latitude) OVER (PARTITION BY vehicle_id ORDER BY timestamp)   as latdiff,
                    longitude - LAG(longitude) OVER (PARTITION BY vehicle_id ORDER BY timestamp) as longdiff,
                    vehicle_id
             from realtime_top2) withnull
    where withnull.latdiff IS NOT NULL
    """
    cur.execute(query, cutofftime)
    result = cur.fetchall()
    resultdict = {row.vehicle_id: (row.latdiff, row.longdiff) for row in result}
    return flask.Response(json.dumps(resultdict), headers=[("Content-Type", "application/json")])


@app.route("/positions-range")
def positions_range():
    query = """
    select realtime.vehicle_id, realtime.route_id, latitude, longitude, timestamp
    from realtime where realtime.timestamp >= %s and realtime.timestamp <= %s ORDER BY timestamp
    """

    timerange = [request.args.get("min-time", type=int), request.args.get("max-time", type=int)]
    assert timerange[0] < timerange[1]
    cur.execute(query, (timerange[0], timerange[1]))
    result = cur.fetchall()
    resultdict = [
        dict(timestamp=row.timestamp, vehicle_id=row.vehicle_id, latitude=row.latitude, longitude=row.longitude,
             route_id=row.route_id) for row
        in result]
    return flask.Response(json.dumps(resultdict), headers=[("Content-Type", "application/json")])
