import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, call, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / ".github/scripts"))
import signed_test_build as build
import verify_test_downloads as verifier


class VerifyTestDownloads(unittest.TestCase):
    def test_current_packaging_names_and_versioned_urls(self):
        package = json.loads((Path(__file__).resolve().parents[1] / "package.json").read_text())
        mac_template = package["build"]["artifactName"]
        windows_template = package["build"]["nsis"]["artifactName"]
        names_by_target = {
            "macos": [mac_template.replace("${os}", "mac").replace("${arch}", arch).replace("${ext}", "dmg") for arch in ["arm64", "x64"]],
            "windows": [windows_template.replace("${arch}", "x64").replace("${ext}", "exe")],
        }
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            for names in names_by_target.values():
                for name in names:
                    (directory / name).write_bytes(b"installer")
            for target in ["macos", "windows", "all"]:
                names = sum(names_by_target.values(), []) if target == "all" else names_by_target[target]
                with self.subTest(target=target), patch.object(verifier, "verify_download") as verify:
                    verifier.verify_test_downloads(directory, target, "0.11.0-test.2+ci", "owner/product")
                    base = "https://modelscope.cn/models/owner/product/resolve/master/releases/test/0.11.0-test.2%2Bci"
                    self.assertEqual(verify.call_args_list, [call(f"{base}/{name}", 9) for name in names])

    def test_rejects_missing_empty_or_unavailable_installers(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            installer = directory / verifier.INSTALLERS["windows"][0][1]
            with patch.object(verifier, "verify_download") as verify:
                with self.assertRaises(ValueError):
                    verifier.verify_test_downloads(directory, "windows", "1.0.2", "owner/product")
                installer.write_bytes(b"")
                with self.assertRaises(ValueError):
                    verifier.verify_test_downloads(directory, "windows", "1.0.2", "owner/product")
                verify.assert_not_called()
            installer.write_bytes(b"test")
            with patch.object(verifier, "verify_download", side_effect=RuntimeError("not public")):
                with self.assertRaisesRegex(RuntimeError, "not public"):
                    verifier.verify_test_downloads(directory, "windows", "1.0.2", "owner/product")

    def test_invalid_inputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            (directory / verifier.INSTALLERS["windows"][0][1]).write_bytes(b"installer")
            for target, version, repo in [
                ("windows", "../bad", "owner/product"),
                ("windows", "1.0.2", "../bad"),
                ("bad", "1.0.2", "owner/product"),
            ]:
                with self.subTest(target=target, version=version, repo=repo), patch.object(verifier, "verify_download") as verify:
                    with self.assertRaises(ValueError):
                        verifier.verify_test_downloads(directory, target, version, repo)
                    verify.assert_not_called()

    def test_range_probe(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = b"t"
        for status, headers in [(206, {"Content-Range": "bytes 0-0/4"}), (200, {"Content-Range": "bytes 0-0/4"}), (200, {"Content-Length": "4"})]:
            response.status, response.headers = status, headers
            with patch.object(build.urllib.request, "urlopen", return_value=response) as request:
                verifier.verify_download("https://example.test/file", 4)
                self.assertEqual(request.call_args.args[0].get_header("Range"), "bytes=0-0")
                self.assertEqual(response.read.call_args.args, (1,))
        response.headers = {"Content-Length": "99"}
        with patch.object(build.urllib.request, "urlopen", return_value=response) as request, patch.object(build.time, "sleep"):
            with self.assertRaises(RuntimeError):
                verifier.verify_download("https://example.test/file", 4)
            self.assertEqual(request.call_count, 6)


if __name__ == "__main__":
    unittest.main()
