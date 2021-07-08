import azure.functions as func
import requests
from . import my_pb2
import pyodbc
import logging
import sys
def handle_exception(exc_type, exc_value, exc_traceback):
    print("Uncaught exception", (exc_type, exc_value, exc_traceback))
    logging.error("Uncaught exception", exc_info=(exc_type, exc_value, exc_traceback))
sys.excepthook = handle_exception


sqlconn = pyodbc.connect(
    "Driver={ODBC Driver 17 for SQL Server};Server=tcp:translink-transit.database.windows.net,1433;Database=transit;Uid=martinliu24;Pwd=LakxXp46LHCvTTL$;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;")
cursor = sqlconn.cursor()
cursor.fast_executemany = True


def main(mytimer: func.TimerRequest) -> None:
    logging.info("Starting")
    response = requests.get("https://gtfs.translink.ca/v2/gtfsposition?apikey=XkJgz46eM82zRr0B3GD7").content
    msg = my_pb2.FeedMessage()
    msg.ParseFromString(response)

    to_insert = []
    for entity in msg.entity:
        vehicle = entity.vehicle
        to_insert.append((vehicle.trip.trip_id, vehicle.trip.start_date, vehicle.trip.route_id, vehicle.trip.direction_id,
              vehicle.position.latitude, vehicle.position.longitude,
              vehicle.current_stop_sequence, vehicle.timestamp, vehicle.stop_id, vehicle.vehicle.id))
    logging.info("inserting")
    cursor.executemany("INSERT INTO realtime VALUES (?,?,?,?,?,?,?,?,?,?)", to_insert)
    sqlconn.commit()
