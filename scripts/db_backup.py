import subprocess
import datetime
import os
from install import load_config

today = datetime.datetime.now()
month = today - datetime.timedelta(days=30)
root_path = os.getcwd().rsplit("/", maxsplit=1)[1]
path = os.path.join(root_path, "db_backup")
config = load_config(os.path.join(root_path, "config.json"))

subprocess.Popen('mysqldump -u {} -p{} {} '
                 '--ignore-table=sampleshare_db.samples_detected_sde '
                 '--ignore-table=sampleshare_db.samples_clean_scl '
                 '--ignore-table=sampleshare_db.user_lists_usl '
                 '--ignore-table=sampleshare_db.user_files_usf > {}/backup-{}.sql'
                 .format(config["db"]["user"], config["db"]["password"], config["db"]["database"], path, today.strftime("%Y-%m-%d")),
                 shell=True,
                 stdout=subprocess.PIPE,
                 stderr=subprocess.PIPE
                 ).communicate()

subprocess.Popen('find {} -name "*.sql" -type f -mtime +30 -delete'.format(path),
                 shell=True,
                 stdout=subprocess.PIPE,
                 stderr=subprocess.PIPE
                 ).communicate()
