# Automatic frontend publishing

Repository: https://github.com/git2664/Amnikon-Website

Scope approved by the owner: **frontend only; preserve backend**. The existing
IIS `/api` application, dedicated pool, SMTP settings and private queues are not
updated by this pipeline. No SMTP key, backend source or deployment password is
needed in GitHub secrets.

Pushes to `main` validate the repaired public-file allowlist and SEO metadata,
test archive rejection rules, then build a production frontend ZIP. GitHub-hosted
Windows runners perform the build. Pull requests run validation without publishing.
Actions are pinned to reviewed official commit hashes.

The publishing job creates a draft GitHub release, uploads all five files, and
publishes it only after the uploads finish. Assets contain static public files,
per-file checksums and metadata identifying the exact main commit/workflow run.
Because the repository is public, these frontend release assets are public too.

The fixed Windows task `Amnikon-Website-AutoDeploy` checks every two minutes. It
accepts releases authored/uploaded by GitHub Actions only when their source SHA
matches current `main` and the expected workflow run has concluded successfully.
It verifies checksums and file boundaries, extracts to a separate release folder,
switches only the frontend IIS path and checks public pages/assets, HTTPS and the
existing API. Failure restores the previous frontend path. Old releases remain
available; there is no source-tree mirror or automatic recursive deletion.

The server executes only administrator-installed deployment scripts. Scripts in a
downloaded release are forbidden. The GitHub runner already registered for another
repository is not modified. The server task uses public HTTPS downloads, requires
no GitHub token, and exposes no inbound deployment port.

## One-time server installation

After reviewing the scripts, run in Administrator Windows PowerShell:

```powershell
& .\deployment\Install-GitHubFrontendTask.ps1
```

It installs a SYSTEM task, with deployment scripts/settings restricted to
administrators and SYSTEM. Site workers receive read access to release folders.
The backend pool can read the frontend parent configuration; neither pool gets
write access to public release files. Local users can read the non-secret status:

```powershell
Get-Content 'C:\ProgramData\Amnikon\GitHubFrontendDeployment\status\latest.json'
```

GitHub Actions turning green means the bundle was validated and published. Actual
IIS deployment is asynchronous (normally the next two-minute check); inspect
`state: deployed`/`up-to-date` and the source SHA in that server status file.
GitHub/public-network outages leave the current website running. Public GitHub API
rate limits also apply; one latest-release request is made per idle check.

Manual build/publish is available through **Actions → Validate and publish website
frontend → Run workflow → main**. Keep direct access to main limited to trusted
maintainers and review changes before merging them.

Updating the protected server deployment logic or changing the API location needs
a separate administrator-reviewed server update; main pushes update static
frontend files only. Previous releases and cached bundles consume disk space;
retain rollback releases and arrange reviewed cleanup as part of server operations.
