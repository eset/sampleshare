import json
import os
import subprocess
from uuid import uuid4
import secrets
import hashlib
import shutil
from collections.abc import Sequence
from typing import Optional, Dict, Union


class ProcessRuntimeError(RuntimeError):
    def __init__(self, *args, retcode=None, stdout=None):
        super().__init__(*args)
        self.stdout = stdout
        self.retcode = retcode


def call_and_check_retcode(cmd: Union[str, Sequence[str]],
                           cwd: Optional[str] = None,
                           env: Optional[Dict[str, str]] = None,
                           input_file: Optional[str] = None,
                           exc_format: str = 'Subprocess returned {retcode}: {stdout}') -> str:
    if env:
        env = {**os.environ, **env}

    if input_file:
        stdin = open(input_file, "r")
    else:
        stdin = None
    p = subprocess.Popen(cmd, cwd=cwd, env=env, stdin=stdin, stderr=subprocess.STDOUT, stdout=subprocess.PIPE, shell=isinstance(cmd, str))
    out, _ = p.communicate()
    out = out.decode()

    if stdin:
        stdin.close()

    if p.returncode != 0:
        raise ProcessRuntimeError(exc_format.format(retcode=p.returncode, stdout=out), retcode=p.returncode, stdout=out)

    return out


def load_config(config_file_path):
    try:
        with open(config_file_path, 'r') as config_file:
            config_data = json.load(config_file)
            return config_data

    except FileNotFoundError:
        print(f"Config file '{config_file_path}' not found.")
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
    except KeyError as e:
        print(f"KeyError: {e} not found in the configuration.")


def run_command(cmd: Sequence[str], cwd: Optional[str] = None):
    try:
        call_and_check_retcode(cmd=cmd, cwd=cwd)
    except subprocess.CalledProcessError as e:
        print(e)


def md5(salt, s):
    return hashlib.md5((salt + s).encode("utf-8")).hexdigest()


def hash_password(pwd):
    salt2 = secrets.token_urlsafe(16)
    return md5(salt2, md5(config["salt1"], pwd)), salt2


if __name__ == "__main__":
    root_path = os.path.dirname(os.path.dirname(__file__))
    config = load_config(os.path.join(root_path, "backend", "config.json"))
    sql_path = os.path.join(os.path.dirname(__file__), "tables.sql")

    # load tables from sql file
    call_and_check_retcode(cmd=['mysql', '-u', config["db"]["user"], '-p{}'.format(config["db"]["password"]), config["db"]["database"]], input_file=sql_path)

    # create admin user
    pwd, salt = hash_password(config["admin_password"])
    sql = "mysql -u {} -p{} {} --execute {}".format(
        config["db"]["user"],
        config["db"]["password"],
        config["db"]["database"],
        "\"INSERT INTO internal_users_uin (fname_uin, lname_uin, email_uin, password_uin, register_date_uin, register_by_uin, enabled_uin, notification_new_account_request_uin, notification_pgp_error_uin, salt_uin, uuid_uin) VALUES ('{}','{}','{}','{}', NOW(), '0', 1, 1, 1, '{}', '{}')\""
        .format("admin", "admin", config["admin_email"], pwd, salt, uuid4())
    )
    call_and_check_retcode(cmd=sql)
    print("Database initialized")

    # run npm for frontend and backend respectively
    call_and_check_retcode(cmd=["npm", "install"], cwd=os.path.join(root_path, "backend"))
    call_and_check_retcode(cmd=["npm", "install"], cwd=os.path.join(root_path, "frontend"))
    print("Installed npm packages for app")

    # run build for frontend
    call_and_check_retcode(cmd=["npm", "run", "build"], cwd=os.path.join(root_path, "frontend"))
    print("App build done")

    call_and_check_retcode(cmd=["npm", "install", "pm2", "--global"])
    print("Installed pm2")

    os.makedirs(config["samples_path"], mode=0o700, exist_ok=True)
    print("Created samples directory at " + config["samples_path"])
    os.makedirs(config["gnu_path"], mode=0o700, exist_ok=True)
    print("Created GPG keyring directory at " + config["gnu_path"])
    os.makedirs(config["log_path"], mode=0o755, exist_ok=True)
    print("Created log directory at " + config["log_path"])

    os.makedirs(os.path.join(root_path, "backend", "tmp"), mode=0o700, exist_ok=True)

    # start pm2 for backend
    call_and_check_retcode(cmd=["pm2", "start", "process.yml", "--env", "production"], cwd=os.path.join(root_path, "backend"))
    print("pm2 initialized")

    # copy nginx config to dir
    if config["nginx"]:
        nginx_dst = os.path.join(config["nginx_path"], "sites-available", "sampleshare")
        nginx_src = os.path.join(os.path.dirname(__file__), "nginx.config")

        # open template
        with open(nginx_src, 'r') as file:
            nginx_template = file.read()

        # add root path to template
        nginx_template = nginx_template.replace("ROOT_PATH", os.path.join(root_path, "frontend", "build"))

        if os.path.exists(nginx_dst):
            print("WARNING: {} already exists, using existing config".format(nginx_dst))
        else:
            # write template to dest
            with open(nginx_dst, 'w') as file:
                file.write(nginx_template)
            print("Copied nginx config")

        # create symlink
        try:
            os.symlink(nginx_dst, os.path.join(config["nginx_path"], "sites-enabled", "sampleshare"))
            print("nginx sampleshare site enabled")
        except FileExistsError:
            print("nginx symlink already exists")
            pass
        except Exception as e:
            print("An error occurred: {}".format(e))
            exit(1)


    # install cron jobs
    if config["cron_jobs"]:

        run_command(
            "crontab -l | {{ cat; echo '30 6 * * * cd {}/scripts && /usr/bin/python3 {}/scripts/db_cleanup.py >> {}/logs/cleanup.log'; }} | crontab -".format(
                root_path, root_path, root_path))
        run_command(
            "crontab -l | {{ cat; echo '0 12 * * sun cd {}/scripts && /usr/bin/python3 {}/scripts/weekly_stats.py'; }} | crontab -".format(
                root_path, root_path))
        run_command(
            "crontab -l | {{ cat; echo '30 * * * * cd {}/scripts && /usr/bin/python3 {}/scripts/import_samples_to_mariadb.py'; }} | crontab -".format(
                root_path, root_path))
        run_command(
            "crontab -l | {{ cat; echo '30 5 * * * cd {}/scripts && /usr/bin/python3 {}/scripts/db_backup.py'; }} | crontab -".format(
                root_path, root_path))
        print("cron jobs installed")

    print("Done")
