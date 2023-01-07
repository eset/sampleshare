import collections
import os
import shutil
import zipfile
from textwrap import wrap
import hashlib

import mariadb
import sys
from install import load_config

root_path = os.getcwd().rsplit("/", maxsplit=1)[1]
config = load_config(os.path.join(root_path, "config.json"))

out_dir = config["samples_path"]

work_dir = os.path.join(out_dir, "incoming")
tmp_dir = os.path.join(out_dir, "tmp")
dirs = ["detected", "clean"]
detected_dirs = ["daily_a", "daily_b", "daily_c", "daily_droid"]


def _is_zip_with_zero_files_only(src):
    """Checks whether the ZIP file contains files with zero length
    """
    zip = zipfile.ZipFile(src)
    sizesinzip = sum(info.file_size for info in zip.filelist)
    if sizesinzip > 0:
        return False
    else:
        return True


def rmpath(*path_list, clear_dirs=False):
    for destination in path_list:
        # remove directory
        if os.path.isdir(destination):
            shutil.rmtree(destination, ignore_errors=True)

        # remove link
        elif os.path.islink(destination):
            os.unlink(destination)

        # remove file
        elif os.path.isfile(destination):
            os.remove(destination)

        if clear_dirs:
            # successively remove every parent directory mentioned in destination path
            destination_dir = os.path.dirname(destination)
            if os.path.isdir(destination_dir):
                # remove only empty directories
                if len(os.listdir(destination_dir)) == 0:
                    os.removedirs(destination_dir)


def mkpath(*path_list):
    for destination in path_list:
        os.makedirs(destination, exist_ok=True)


def walk(dirpath):
    _pckgs = []
    for root, dirs, files in os.walk(dirpath):
        for pkgname in files:
            if not pkgname.endswith('.zip'):
                continue

            pkgpath = os.path.join(root, pkgname)
            pkgsize = os.path.getsize(pkgpath)

            if pkgsize == 0:  # exclude empty files
                rmpath(pkgpath)
                continue

            if _is_zip_with_zero_files_only(pkgpath):
                rmpath(pkgpath)
                return

            _pckgs.append(pkgpath)
    return _pckgs


def unzip_move_import(_pkg, _path, sample_type, detected=None):
    tmp_path = path + '.__tmp'
    rmpath(tmp_path)  # delete previously created dir and its content
    mkpath(tmp_path)  # create new dir if not exists

    try:
        with zipfile.ZipFile(_pkg, 'r') as zip_ref:
            zip_ref.extractall(tmp_path)
    except zipfile.error:
        return

    file_names = os.listdir(tmp_path)
    for f in file_names:
        sha256 = hashlib.sha256()
        md5 = hashlib.md5()
        with open(os.path.join(tmp_path, f), "rb") as sample:
            for byte_block in iter(lambda: sample.read(4096), b""):
                sha256.update(byte_block)
                md5.update(byte_block)
            md5 = md5.hexdigest()
            sha256 = sha256.hexdigest()
            md5 = md5.upper()
            sha256 = sha256.upper()
        f_hex = wrap(md5.upper().encode("utf-8").hex(), 3)
        out_path = os.path.join(out_dir, sample_type, f_hex[0], f_hex[1], f_hex[2])
        print(out_path)
        mkpath(out_path)
        new_path = os.path.join(out_path, md5.upper().encode("utf-8").hex())
        try:
            shutil.move(os.path.join(tmp_path, f), new_path)
        except shutil.Error as err:
            print(err)
        import_to_db(md5, sha256, os.path.getsize(new_path), sample_type, detected)


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

# Get Cursor
cur = conn.cursor()


def import_to_db(md5, sha256, size, sample_type, detected=None):
    try:
        if sample_type == "detected":
            sql = "INSERT INTO samples_detected_sde (md5_sde, sha256_sde, file_size_sde, added_when_sde, type_sde, " \
                  "enabled_sde) VALUES (" \
                  "'{}', '{}', '{}', NOW(), '{}', '1')".format(md5, sha256, size, detected)
            cur.execute(sql)
            conn.commit()
        else:
            sql = "INSERT INTO samples_clean_scl (md5_scl, sha256_scl, file_size_scl, added_when_scl, type_scl, " \
                        "enabled_scl) VALUES " \
                        "('{}', '{}', '{}', NOW(), 'daily_clean', '1')".format(md5, sha256, size)
            print (sql)
            cur.execute(sql)
            conn.commit()
    except mariadb.Error as err:
        print(err)
        pass


for _dir in dirs:
    if _dir == "detected":
        for _detected in detected_dirs:
            path = os.path.join(work_dir, _dir, _detected)
            list_pkg = walk(path)
            for pkg in list_pkg:
                unzip_move_import(pkg, path, _dir, _detected)
                os.remove(pkg)
            shutil.rmtree(os.path.join(work_dir, _dir, _detected), ignore_errors=False)
            mkpath(os.path.join(work_dir, _dir, _detected))

    else:
        path = os.path.join(work_dir, _dir)
        list_pkg = walk(path)
        for pkg in list_pkg:
            unzip_move_import(pkg, path, _dir)
        shutil.rmtree(os.path.join(work_dir, _dir), ignore_errors=False)
        mkpath(os.path.join(work_dir, _dir))

conn.commit()
conn.close()
