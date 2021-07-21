import pandas as pd, psycopg2
import matplotlib.pyplot as plt
from datetime import datetime
qlconn = psycopg2.connect(host="henry-80q7.local", user="transit", dbname="transit", password="transit")

data = pd.read_sql_query("""
select * from 
(select *, ROW_NUMBER() OVER (order by timestamp DESC) as rn from realtime) a
where a.rn % 3000 = 0 LIMIT 100000
""", qlconn)
data["timestamp"] = data["timestamp"].map(datetime.fromtimestamp)
data.hist("timestamp", figsize = (10, 3))
plt.show()