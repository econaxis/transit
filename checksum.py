import hashlib, requests, time
from datetime import datetime
import pprint


pp = pprint.PrettyPrinter(width = 160)

lasttime = 0
hash = None

data = dict()
while True:
    response = requests.get("https://api.translink.ca/rttiapi/v1/buses?apikey=XkJgz46eM82zRr0B3GD7", headers={
        "content-type": "application/JSON",
        "accept": "application/JSON"
    }).json()


    times = []
    for j in response:
        d = j["RecordedTime"]

        if j["VehicleNo"] in data:
            data[j["VehicleNo"]].append(d)
        else:
            data[j["VehicleNo"]] = [d]

    pp.pprint(data)
    time.sleep(1)

