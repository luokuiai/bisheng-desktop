import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('test channel packaging and summary', () => {
  it('builds prefixed upload destinations and summary links for each test target', () => {
    execFileSync('python3', ['-c', String.raw`
import contextlib, os, sys, tempfile, types
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path('.github/scripts').resolve()))
import signed_test_build as build

with tempfile.TemporaryDirectory() as work:
    directory = Path(work)
    for name in ['luokui-ai-mac-arm64.dmg', 'luokui-ai-mac-x64.dmg', 'luokui-ai-windows-x64-setup.exe']:
        (directory / name).write_text('content', encoding='utf-8')
    for target, count in [('all', 3), ('macos', 2), ('windows', 1)]:
        files = build.installer_paths(directory, target)
        assert len(files) == count
        notes = build.build_summary('1.0.0-test.1', files, 'example/desktop', 'test/1.0.0-test.1/42', 'https://github.com/example/desktop/actions/runs/42')
        assert notes.count('/resolve/master/test/') == count
        assert '测试建议' in notes
        assert '本次为签名测试安装包' not in notes
        assert '已通过签名' not in notes
        assert '客户端中更新' not in notes
    assert build.test_prefix('1.0.0-test.1', '42') == 'test/1.0.0-test.1/42'
    for version in ['../latest', 'v1.0.0', '1.0.0/test']:
        try:
            build.test_prefix(version, '42')
        except ValueError:
            pass
        else:
            raise AssertionError(f'invalid version accepted: {version}')
    for run_id in ['0', '-1', 'abc']:
        try:
            build.test_prefix('1.0.0-test.1', run_id)
        except ValueError:
            pass
        else:
            raise AssertionError(f'invalid run_id accepted: {run_id}')
`], { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
  })

  it('uploads all target installers and writes a summary after public download verification', () => {
    execFileSync('python3', ['-c', String.raw`
import contextlib, os, sys, tempfile, types
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path('.github/scripts').resolve()))
import signed_test_build as build

with tempfile.TemporaryDirectory() as work:
    directory = Path(work)
    (directory / 'luokui-ai-windows-x64-setup.exe').write_text('content', encoding='utf-8')
    events = []
    api = MagicMock()
    api.upload_file.side_effect = lambda **kwargs: events.append(('upload', kwargs['path_in_repo']))
    sdk = types.ModuleType('modelscope.hub.api')
    sdk.HubApi = lambda: api
    summary = directory / 'summary'
    env = dict(MODELSCOPE_REPO_ID='example/desktop', MODELSCOPE_TOKEN='fixture', GITHUB_SERVER_URL='https://github.com', GITHUB_REPOSITORY='example/desktop', GITHUB_STEP_SUMMARY=str(summary))
    argv = ['signed_test_build.py', '--directory', work, '--target', 'windows', '--version', '1.0.0-test.1', '--run-id', '42']
    with patch.dict(sys.modules, {'modelscope': types.ModuleType('modelscope'), 'modelscope.hub': types.ModuleType('modelscope.hub'), 'modelscope.hub.api': sdk}), patch.dict(os.environ, env), patch.object(sys, 'argv', argv), patch.object(build, 'build_test_changes', return_value='feat: New Office preview\nDescription of preview') as changes, patch.object(build, 'verify_download', side_effect=lambda *args: events.append(('verify', args[0]))) as verify:
        build.main()
        assert [event[0] for event in events] == ['upload', 'verify', 'upload', 'verify']
        assert events[0][1] == 'test/1.0.0-test.1/42/luokui-ai-windows-x64-setup.exe'
        assert events[2][1] == 'test/1.0.0-test.1/42/test-changes.md'
        notes = summary.read_text(encoding='utf-8')
        assert 'Description of preview' in notes
        assert 'Windows x64' in notes
        summary.unlink()
        api.upload_file.side_effect = RuntimeError('upload failed')
        try:
            build.main()
        except RuntimeError:
            pass
        else:
            raise AssertionError('upload failure swallowed')
        assert not summary.exists()
        verify.side_effect = None
        changes.side_effect = RuntimeError('git history unavailable')
        api.upload_file.reset_mock()
        try:
            build.main()
        except RuntimeError:
            pass
        else:
            raise AssertionError('missing change evidence accepted')
        api.upload_file.assert_not_called()
        assert not summary.exists()
        changes.side_effect = None
        api.upload_file.side_effect = None
        verify.side_effect = RuntimeError('public download failed')
        try:
            build.main()
        except RuntimeError:
            pass
        else:
            raise AssertionError('unverified installer published')
        assert not summary.exists()
print('signed test build behavior passed')
`], { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
  })

  it('waits for the selected platform verification gates in legacy signed mode', () => {
    const yaml = require('js-yaml') as { load(source: string): { jobs: Record<string, { needs: string[]; if: string }> } }
    const workflow = yaml.load(readFileSync('.github/workflows/release.yml', 'utf8'))
    const job = workflow.jobs['publish-signed']
    expect(job?.needs).toEqual(['macos', 'windows-x64'])
    expect(job?.if).toContain("inputs.mode == 'signed'")
    expect(job?.if).toContain("inputs.signed_version != ''")
    expect(job?.if).toContain("inputs.target == 'all' && needs.macos.result == 'success' && needs.windows-x64.result == 'success'")
    expect(job?.if).toContain("inputs.target == 'windows' && needs.windows-x64.result == 'success'")
    expect(job?.if).toContain("inputs.target == 'macos' && needs.macos.result == 'success'")
  })

  it('summarizes Chinese test changes with validated output and real git ranges', () => {
    execFileSync('python3', ['test/test-change-summary.test.py'], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    })
  })
})
