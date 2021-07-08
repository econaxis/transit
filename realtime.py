from azure.storage.blob import BlobServiceClient, ContainerClient, generate_account_sas, ResourceTypes, \
    AccountSasPermissions
from azure.storage.queue import QueueClient
from datetime import datetime
import flask

blob_service_client = BlobServiceClient.from_connection_string(
    conn_str="DefaultEndpointsProtocol=https;AccountName=storageaccounttransbc67;AccountKey=De187+KqHglpnjS3Uj+48Xp2cW4uSZU8GXZ5LDAPW5eqI3kpMyUXSbbXUmZv1rQsdTAdgb1QdRDdm9VsaixEww==;EndpointSuffix=core.windows.net")
queue_client = QueueClient.from_connection_string(
    conn_str="DefaultEndpointsProtocol=https;AccountName=storageaccounttransbc67;AccountKey=De187+KqHglpnjS3Uj+48Xp2cW4uSZU8GXZ5LDAPW5eqI3kpMyUXSbbXUmZv1rQsdTAdgb1QdRDdm9VsaixEww==;EndpointSuffix=core.windows.net"
    , queue_name="transit-queue")

conn = blob_service_client.get_container_client("transit")

app = flask.Flask(__name__)


@app.route("/positions")
def positions():
