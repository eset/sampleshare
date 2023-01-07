import os

import mariadb
import sys
import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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


def readable_size(size):
    UNIT_SIZE = 1024
    for unit in ('B', 'kB', 'MB', 'GB', 'TB'):
        try:
            new_size = size
            size = size / UNIT_SIZE
        except:
            return "0B"
        if size < 1:
            break
    return "{}{}".format(round(new_size, 2), unit)


# Get Cursor
cur = conn.cursor()

# get current day time
today = datetime.datetime.now()
d7 = today - datetime.timedelta(days=6)

sql = "SELECT COUNT(*), SUM(file_size_sde) FROM samples_detected_sde WHERE added_when_sde BETWEEN '{}' AND '{}'".format(
    d7.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"))
cur.execute(sql)
result1 = cur.fetchall()

sql = "SELECT COUNT(*), SUM(file_size_scl) FROM samples_clean_scl WHERE added_when_scl BETWEEN '{}' AND '{}'".format(
    d7.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"))
cur.execute(sql)
result2 = cur.fetchall()

sql = "SELECT uuid_usr, id_usr, name_usr, company_usr from external_users_usr WHERE status_usr = 2"
cur.execute(sql)
result3 = cur.fetchall()

sumCountDet = 0
sumSizeDet = 0
sumCountCln = 0
sumSizeCln = 0

_list = []

for uuid_usr, id_usr, name_usr, company_usr in result3:
    sql = "SELECT sum(count_usf), SUM(file_size_usf * count_usf) FROM user_files_usf WHERE (uuidusr_usf='{}' or uuidusr_usf='{}') AND count_usf>0 AND is_detected='1' AND date_usf BETWEEN '{}' AND '{}'".format(
        uuid_usr, id_usr, d7.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"))
    cur.execute(sql)
    result4 = cur.fetchall()
    try:
        sumCountDet += result4[0][0]
        sumSizeDet += result4[0][1]
    except:
        pass

    sql = "SELECT sum(count_usf), SUM(file_size_usf * count_usf) FROM user_files_usf WHERE (uuidusr_usf='{}' or uuidusr_usf='{}') AND count_usf>0 AND is_detected='0' AND date_usf BETWEEN '{}' AND '{}'".format(
        uuid_usr, id_usr, d7.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"))
    cur.execute(sql)
    result5 = cur.fetchall()

    try:
        sumCountCln += result5[0][0]
        sumSizeCln += result5[0][1]
    except:
        pass

    result4 = list(result4[0])
    result5 = list(result5[0])
    if result4[0] is None:
        result4[0] = 0
    if result5[0] is None:
        result5[0] = 0

    _list.append([name_usr, company_usr, result4[0], result4[1], result5[0], result5[1]])

with open("weekly_stats.html", "w") as html_file:
    html_file.write("<!DOCTYPE html><html><body>")
    html_file.write("<h2>Sampleshare stats for the last 7 days: {} - {}</h2>".format(d7.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d")))
    html_file.write("<h3>Detected samples: {} - {}</h3>".format(result1[0][0], readable_size(result1[0][1])))
    html_file.write("<h3>Clean samples: {} - {}</h3>".format(result2[0][0], readable_size(result2[0][1])))
    html_file.write("<h3>Total samples: {} - {}</h3>".format(result1[0][0] + result2[0][0], readable_size(result1[0][1] + result2[0][1])))
    html_file.write("<h3>Total downloaded: {} - {}</h3>".format(sumCountDet + sumCountCln, readable_size(sumSizeDet + sumSizeCln)))
    html_file.write("<br><br><h2>Downloads by Users </h2><br><br>")

    html_file.write("<table style='width:100%'> <tr align='left'> <th align='left'>User</th> <th align='left'>Company</th> <th align='left'>DownloadsDetected</th> <th align='left'>TotalSizeDetected(MB)</th><th align='left'>DownloadsClean</th><th align='left'>TotalSizeClean(MB)</th></tr>")

    _list.sort(key=lambda _list: _list[2], reverse=True)
    for item in _list:
        html_file.write("<tr> <td> {} </td>  <td> {} </td> <td> {} </td> <td> {} </td> <td> {} </td> <td> {} </td> </tr> ".format(item[0], item[1], item[2], readable_size(item[3]), item[4], readable_size(item[5])))
    html_file.write("</table><br><br></body></html>")
    html_file.close()

login = config["mail"]["user"]
password = config["mail"]["pass"]

sender_email = "virex.sampleshare.com"
message = MIMEMultipart("alternative")
message["Subject"] = "Sampleshare Weekly Stats"
message["From"] = sender_email

with open("weekly_stats.html", "r") as html_file:
    html = html_file.read()
    message.attach(MIMEText(html, "html"))

sql = "SELECT email_uin from internal_users_uin"
cur.execute(sql)
result = cur.fetchall()
with smtplib.SMTP(config["mail"]["host"], 25) as server:
    server.login(login, password)
    for email in result:
        server.sendmail(
            sender_email, email[0], message.as_string()
        )

os.remove("weekly_stats.html")


