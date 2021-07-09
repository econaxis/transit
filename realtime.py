import json
import flask
import redis
from flask import request
from flask_cors import CORS
import pyodbc
from datetime import datetime, timedelta

sqlconn = pyodbc.connect(
    "Driver={ODBC Driver 17 for SQL Server};Server=tcp:translink-transit.database.windows.net,1433;Database=transit;Uid=martinliu24;Pwd=LakxXp46LHCvTTL$;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;")
cur = sqlconn.cursor()
redis = redis.StrictRedis(host="redis-18070.c53.west-us.azure.cloud.redislabs.com", port=18070,
                          password="nhWkkCADbwbFrLG9dVjFzPOqCWcQJ6LZ")

app = flask.Flask(__name__)
CORS(app)

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

    result = cur.execute(query, cutofftime).fetchall()

    resultstr = json.dumps([dict(
        vehicle_id=x.vehicle_id, latitude=x.latitude, longitude=x.longitude, timestamp=x.timestamp, trip_id=x.trip_id,
        cur_stop_sequence=x.cur_stop_sequence, route_id=x.route_id
    ) for x in result])

    return flask.Response(resultstr, headers=[("Content-Type", "application/json")])


@app.route("/headsigns")
def headsigns():
    result = cur.execute("""
    select * from headsigns
    """).fetchall()

    resultdict = {y.route_id: (y.routenumber, y.headsign) for y in result}
    return flask.Response(json.dumps(resultdict), headers=[("Content-Type", "application/json")])


@app.route("/history")
def history():
    cur = sqlconn.cursor()
    vehicleid = request.args.get("vehicleid")

    result = cur.execute("""
    select distinct TOP 30 timestamp, latitude, longitude from realtime where vehicle_id=? ORDER BY realtime.timestamp DESC
    """, vehicleid).fetchall()


    resultdict = [dict(timestamp = y.timestamp, latitude = y.latitude, longitude = y.longitude) for y in result]
    return flask.Response(json.dumps(resultdict), headers=[("Content-Type", "application/json")])

