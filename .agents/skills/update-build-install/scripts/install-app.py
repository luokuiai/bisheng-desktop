"""Install a verified macOS bundle from this checkout's local build."""

import ctypes
import fcntl
import json
import os
from pathlib import Path
import plistlib
import subprocess
import sys
import tempfile


def info(app):
    with (app / 'Contents/Info.plist').open('rb') as stream:
        return plistlib.load(stream)


def install(source, applications, manifest):
    product = manifest['build']['productName']
    app_id = manifest['build']['appId']
    target = applications / (product + '.app')
    metadata = info(source)
    if (source.name != target.name or source.is_symlink() or
            metadata['CFBundleIdentifier'] != app_id or
            metadata['CFBundleShortVersionString'] != manifest['version']):
        raise ValueError(f'应用名称、标识或版本与 package.json 不一致：{source}')

    with tempfile.TemporaryDirectory(prefix='.desktop-install-', dir=applications) as stage:
        staged = Path(stage) / target.name
        subprocess.run(['ditto', source, staged], check=True)
        subprocess.run(['codesign', '--verify', '--deep', '--strict', staged], check=True)
        # Serialize the short promotion step across concurrent installs of this skill.
        directory_fd = os.open(applications, os.O_RDONLY)
        try:
            fcntl.flock(directory_fd, fcntl.LOCK_EX)
            if target.is_symlink() or (target.exists() and info(target)['CFBundleIdentifier'] != app_id):
                raise ValueError(f'安装位置已被其他应用或链接占用：{target}')
            processes = subprocess.check_output(['ps', '-axo', 'comm='], text=True)
            if any(command.strip().startswith(str(target) + '/') for command in processes.splitlines()):
                raise RuntimeError(f'应用仍在运行，请保存工作并退出后重试：{target}')

            # Darwin renamex_np swaps both bundles atomically, or leaves both in place on failure.
            # RENAME_EXCL also protects a fresh install against a concurrent Finder copy.
            rename = ctypes.CDLL(None, use_errno=True).renamex_np
            rename.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_uint]
            rename.restype = ctypes.c_int
            rename_swap, rename_excl = 0x2, 0x4
            if rename(os.fsencode(staged), os.fsencode(target), rename_swap if target.exists() else rename_excl):
                error = ctypes.get_errno()
                raise OSError(error, os.strerror(error), str(target))
        finally:
            os.close(directory_fd)
    return target


if __name__ == '__main__':
    if sys.platform != 'darwin' or len(sys.argv) != 2:
        sys.exit('用法（macOS 仓库根目录）：python3 -I install-app.py <已挂载的应用.app>')
    try:
        manifest = json.loads(Path('package.json').read_text())
        print(install(Path(sys.argv[1]), Path('/Applications'), manifest))
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
