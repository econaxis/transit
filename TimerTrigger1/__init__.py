import azure.functions as func
import logging
import azure
from azure.storage.blob import BlobServiceClient, generate_account_sas, ResourceTypes, AccountSasPermissions
from datetime import date, datetime
import requests
import zstandard as zstd
import redis

redis = redis.StrictRedis (host="redis-18070.c53.west-us.azure.cloud.redislabs.com", port = 18070, password="nhWkkCADbwbFrLG9dVjFzPOqCWcQJ6LZ")
blob_service_client = BlobServiceClient.from_connection_string(conn_str="DefaultEndpointsProtocol=https;AccountName=storageaccounttransbc67;AccountKey=De187+KqHglpnjS3Uj+48Xp2cW4uSZU8GXZ5LDAPW5eqI3kpMyUXSbbXUmZv1rQsdTAdgb1QdRDdm9VsaixEww==;EndpointSuffix=core.windows.net")
compressor = None


def main(mytimer: func.TimerRequest, context: azure.functions.Context) -> None:
    global compressor

    date = datetime.now().isoformat()
    blob_client = blob_service_client.get_blob_client(container = "transit", blob = date)

    response = requests.get("https://gtfs.translink.ca/v2/gtfsposition?apikey=XkJgz46eM82zRr0B3GD7").content

    if not compressor:
        dictionary = zstd.ZstdCompressionDict(open(context.function_directory + "/dict", "rb").read())
        compressor = zstd.ZstdCompressor(dict_data=dictionary, level = 22)

    response = compressor.compress(response)
    logging.info(len(response))
    blob_client.upload_blob(response, length = len(response), metadata = {"zstd": "true"})
    redis.lpush("queue", date)