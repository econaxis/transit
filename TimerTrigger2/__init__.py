import logging
import azure.functions as func
import sys


def handle_exception(exc_type, exc_value, exc_traceback):
    print("Uncaught exception", (exc_type, exc_value, exc_traceback))
    logging.error("Uncaught exception", exc_info=(exc_type, exc_value, exc_traceback))

logging.info("Init")
sys.excepthook = handle_exception

import requests
from . import my_pb2
import pyodbc


sqlconn = pyodbc.connect(
    "Driver={ODBC Driver 17 for SQL Server};Server=tcp:translink-transit.database.windows.net,1433;Database=transit;Uid=martinliu24;Pwd=LakxXp46LHCvTTL$;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;")
print("Connected to SQL database")
cursor = sqlconn.cursor()
cursor.fast_executemany = True

prev_cache = {}

def main(mytimer: func.TimerRequest) -> None:
    if len(prev_cache) == 0:
        print("Starting from fresh")

    response = requests.get("https://gtfs.translink.ca/v2/gtfsposition?apikey=XkJgz46eM82zRr0B3GD7").content
    msg = my_pb2.FeedMessage()
    msg.ParseFromString(response)
    response = None

    to_insert = []

    for entity in msg.entity:
        vehicle = entity.vehicle
        if prev_cache.get(vehicle.vehicle.id, 0) != vehicle.timestamp:
            prev_cache[vehicle.vehicle.id] = vehicle.timestamp
            to_insert.append(
                (vehicle.trip.trip_id, vehicle.trip.start_date, vehicle.trip.route_id, vehicle.trip.direction_id,
                 vehicle.position.latitude, vehicle.position.longitude,
                 vehicle.current_stop_sequence, vehicle.timestamp, vehicle.stop_id, vehicle.vehicle.id))

    logging.info("Inserting %s", len(to_insert))

    if to_insert:
        cursor.executemany("INSERT INTO realtime VALUES (?,?,?,?,?,?,?,?,?,?)", to_insert)
    sqlconn.commit()
