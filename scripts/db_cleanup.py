import os.path
from textwrap import wrap
from uuid import uuid4
import mariadb
import sys
from install import load_config

root_path = os.getcwd().rsplit("/", maxsplit=1)[1]
config = load_config(os.path.join(root_path, "config.json"))

try:
    conn = mariadb.connect(
        user=config["db"]["user"],
        password=config["db"]["password"],
        database=config["db"]["database"],
        host="localhost",
        port=3306
    )
except mariadb.Error as e:
    print(f"Error connecting to MariaDB Platform: {e}")
    sys.exit(1)

cur = conn.cursor()

grp = ['sde', 'scl']
out_dir = '/mnt/data/'


sql1 = "SELECT id_{} as _id, md5_{} as _md5 FROM samples_{}_{} WHERE DATE_SUB(NOW(), INTERVAL 30 DAY) > added_when_{}"
sql2 = "DELETE FROM samples_{}_{} WHERE id_{} = {}"

for _set in grp:
    _dir = 'detected' if _set == 'sde' else 'clean'
    cur.execute(sql1.format(_set, _set, _dir, _set, _set))
    result = cur.fetchall()

    for _id, _md5 in result:
        f_hex = wrap(_md5.upper().encode("utf-8").hex(), 3)
        f_path = os.path.join(out_dir, _dir, f_hex[0], f_hex[1], f_hex[2], _md5.upper().encode("utf-8").hex())
        if not os.path.exists(f_path):
            print("File not found: {}".format(f_path))
            
        else:
            try:
                os.remove(f_path)
                print("File removed from storage: {}".format(f_path))
            except OSError as err:
                print(err)
                continue
        sql = sql2.format(_dir, _set, _set, _id)
        print(sql)
        cur.execute(sql)
        conn.commit()
conn.commit()
conn.close()
