import math
import requests

# def deg2num(lat_deg, lon_deg, zoom):
#   lat_rad = math.radians(lat_deg)
#   n = 2.0 ** zoom
#   xtile = int((lon_deg + 180.0) / 360.0 * n)
#   ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
#   return (xtile, ytile)
#
# lat = 49.283
# long = -123.121
#
# def get_url(lat, long, zoom):
#   url= "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
#   xtile, ytile = deg2num(lat, long, zoom)
#   url = url.format(z = zoom, x = xtile, y = ytile)
#
#   print(url)
#   open("/tmp/x.png", "wb").write(requests.get(url).content)
#
#
# get_url(lat, long, 18)

