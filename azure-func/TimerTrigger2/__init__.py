import logging
import azure.functions as func
import sys
from datetime import datetime
import psycopg2.extras
import requests
import my_pb2
import time
import psycopg2

sqlconn = psycopg2.connect(host = "henry-80q7.local", user = "transit", dbname = "transit", password = "transit")
cur = sqlconn.cursor()

prev_cache = {}

def main(mytimer: func.TimerRequest) -> None:
    if len(prev_cache) == 0:
        print("Starting from fresh")

    response = requests.get("https://gtfs.translink.ca/v2/gtfsposition?apikey=XkJgz46eM82zRr0B3GD7").content
    msg = my_pb2.FeedMessage()
    msg.ParseFromString(response)
    response = None

    to_insert = []

    now = datetime.now().timestamp()

    for entity in msg.entity:
        vehicle = entity.vehicle   
         
        if vehicle.position.latitude == 0:
            continue

        if prev_cache.get(vehicle.vehicle.id, 0) != vehicle.timestamp:
            prev_cache[vehicle.vehicle.id] = vehicle.timestamp
            to_insert.append(
                (vehicle.trip.trip_id, vehicle.trip.start_date, vehicle.trip.route_id, vehicle.trip.direction_id,
                 vehicle.position.latitude, vehicle.position.longitude,
                 vehicle.current_stop_sequence, vehicle.timestamp, vehicle.stop_id, vehicle.vehicle.id, now))


    if to_insert:
        psycopg2.extras.execute_values(cur,"INSERT INTO realtime VALUES %s ON CONFLICT DO NOTHING", to_insert)
    print("Inserted %s", len(to_insert))
    sqlconn.commit()


while True:
    time.sleep(10)
    main(None)