import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, call, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / ".github/scripts"))
import signed_test_build as build
import signed_test_downloads as downloads


class SignedTestDownloads(unittest.TestCase):
    def test_selected_installer_names_match_packager_and_summary(self):
        package = json.loads((Path(__file__).resolve().parents[1] / "package.json").read_text())
        mac_template = package["build"]["artifactName"]
        windows_template = package["build"]["nsis"]["artifactName"]
        names_by_target = {
            "macos": [mac_template.replace("${os}", "mac").replace("${arch}", arch).replace("${ext}", "dmg") for arch in ["arm64", "x64"]],
            "windows": [windows_template.replace("${arch}", "x64").replace("${ext}", "exe")],
        }
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            all_names = names_by_target["macos"] + names_by_target["windows"]
            for name in all_names:
                (directory / name).write_bytes(b"installer")
            for target, names in (*names_by_target.items(), ("all", all_names)):
                with self.subTest(target=target), patch.object(downloads, "verify_download") as verify, patch.object(downloads, "build_test_changes", return_value="中文提测说明"), patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": str(directory / target), "GITHUB_REPOSITORY": "example/desktop", "GITHUB_RUN_ID": "42"}):
                    downloads.verify_and_summarize(directory, target, "1.0.2-test.1+ci", "owner/product")
                    urls = [f"https://modelscope.cn/models/owner/product/resolve/master/releases/test/1.0.2-test.1%2Bci/{name}" for name in names]
                    self.assertEqual(verify.call_args_list, [call(url, 9) for url in urls])
                    notes = (directory / target).read_text(encoding="utf-8")
                    self.assertEqual(notes.count("https://modelscope.cn/"), len(names))
                    self.assertIn("中文提测说明", notes)
                    self.assertIn("/example/desktop/actions/runs/42", notes)
                    for url in urls:
                        self.assertIn(url, notes)

    def test_failed_download_and_invalid_inputs_leave_no_summary(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            summary = directory / "summary"
            installer = directory / build.INSTALLERS["windows"][0][1]
            installer.write_bytes(b"installer")
            with patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": str(summary)}), patch.object(downloads, "verify_download", side_effect=RuntimeError("not public")) as verify, patch.object(downloads, "build_test_changes") as changes:
                with self.assertRaisesRegex(RuntimeError, "not public"):
                    downloads.verify_and_summarize(directory, "windows", "1.0.2", "owner/product")
                verify.reset_mock()
                for target, version, repo in [("all", "../bad", "owner/product"), ("windows", "1.0.2", "../bad"), ("bad", "1.0.2", "owner/product")]:
                    with self.subTest(target=target, version=version, repo=repo), self.assertRaises(ValueError):
                        downloads.verify_and_summarize(directory, target, version, repo)
                installer.write_bytes(b"")
                with self.assertRaisesRegex(ValueError, "Missing or empty"):
                    downloads.verify_and_summarize(directory, "windows", "1.0.2", "owner/product")
                verify.assert_not_called()
                changes.assert_not_called()
                self.assertFalse(summary.exists())

    def test_range_probe(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = b"t"
        for status, headers in [(206, {"Content-Range": "bytes 0-0/4"}), (200, {"Content-Range": "bytes 0-0/4"}), (200, {"Content-Length": "4"})]:
            response.status, response.headers = status, headers
            with patch.object(build.urllib.request, "urlopen", return_value=response) as request:
                build.verify_download("https://example.test/file", 4)
                self.assertEqual(request.call_args.args[0].get_header("Range"), "bytes=0-0")
                self.assertEqual(response.read.call_args.args, (1,))
        response.headers = {"Content-Length": "99"}
        with patch.object(build.urllib.request, "urlopen", return_value=response) as request, patch.object(build.time, "sleep"):
            with self.assertRaises(RuntimeError):
                build.verify_download("https://example.test/file", 4)
            self.assertEqual(request.call_count, 6)


if __name__ == "__main__":
    unittest.main()
