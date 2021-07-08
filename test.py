from TimerTrigger1 import my_pb2
import requests
from google.protobuf.json_format import MessageToJson

f = open("/tmp/position.json", "w+")
p = my_pb2.FeedMessage()

str = requests.get("https://gtfs.translink.ca/v2/gtfsposition?apikey=XkJgz46eM82zRr0B3GD7").content
p.ParseFromString(str)

p = MessageToJson(p)
f.write(p)
