import azure.functions as func
import requests
import my_pb2
import pyodbc

sqlconn = pyodbc.connect(
    "Driver={ODBC Driver 17 for SQL Server};Server=tcp:translink-transit.database.windows.net,1433;Database=transit;Uid=martinliu24;Pwd=LakxXp46LHCvTTL$;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;")
cursor = sqlconn.cursor()
cursor.fast_executemany = True


def main(mytimer: func.TimerRequest) -> None:
    response = requests.get("https://gtfs.translink.ca/v2/gtfsposition?apikey=XkJgz46eM82zRr0B3GD7").content
    msg = my_pb2.FeedMessage()
    msg.ParseFromString(response)

    to_insert = []
    for entity in msg.entity:
        vehicle = entity.vehicle
        to_insert.append((vehicle.trip.trip_id, vehicle.trip.start_date, vehicle.trip.route_id, vehicle.trip.direction_id,
              vehicle.position.latitude, vehicle.position.longitude,
              vehicle.current_stop_sequence, vehicle.timestamp, vehicle.stop_id, vehicle.vehicle.id))
    print("inserting")
    cursor.executemany("INSERT INTO realtime VALUES (?,?,?,?,?,?,?,?,?,?)", to_insert)