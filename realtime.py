from azure.storage.blob import BlobServiceClient
import flask
import redis
import zstandard as zstd
from TimerTrigger1 import my_pb2 as PBDef
from google.protobuf.json_format import MessageToJson
import sqlite3


con = sqlite3.connect("transit.db")

cur = con.cursor()
redis = redis.StrictRedis (host="redis-18070.c53.west-us.azure.cloud.redislabs.com", port = 18070, password="nhWkkCADbwbFrLG9dVjFzPOqCWcQJ6LZ")
blob_service_client = BlobServiceClient.from_connection_string(
    conn_str="DefaultEndpointsProtocol=https;AccountName=storageaccounttransbc67;AccountKey=De187+KqHglpnjS3Uj+48Xp2cW4uSZU8GXZ5LDAPW5eqI3kpMyUXSbbXUmZv1rQsdTAdgb1QdRDdm9VsaixEww==;EndpointSuffix=core.windows.net")


blob_service = blob_service_client.get_container_client("transit")

app = flask.Flask(__name__)

dictionary = zstd.ZstdCompressionDict(open("TimerTrigger1/dict", "rb").read())
decompressor = zstd.ZstdDecompressor(dict_data=dictionary)

@app.route("/positions")
def positions():
    lastupdate = redis.lindex("queue", 0)

    if redis.get("cache") == lastupdate:
        print("using cache")
        feedmessage_json = redis.get("cache_content")
    else:
        bytes = blob_service.download_blob(lastupdate).content_as_bytes()
        bytes = decompressor.decompress(bytes)
        feedmessage = PBDef.FeedMessage()
        feedmessage.ParseFromString(bytes)
        feedmessage_json = MessageToJson(feedmessage)

        transaction = redis.pipeline()
        transaction.set("cache", lastupdate)
        transaction.set("cache_content", feedmessage_json)
        transaction.ltrim("queue", 0, 3)
        transaction.execute()

    response = flask.Response(feedmessage_json, headers=[("Content-Type", "application/json")])
    return response

