I've used [Chocolatey](https://chocolatey.org/) previously, but was never quite satisfied with it - primarily because it installs packages globally, and requires admin privileges on each install. I've discovered [Scoop](https://scoop.sh/) a couple of years back and have been using it since - it's pretty good. In this post I'm going to cover installing it, basic usage, how it works and some drawbacks.

## Overview

Scoop is an _app_ manager, rather than a _package_ manager - it doesn't know about libraries, and only installs whole, functional applications. It installs apps in the current user's home directory, in `$HOME/scoop` and does not require admin permissions. Scoop is primarily intended for managing ["portable"](https://en.wikipedia.org/wiki/Portable_application), command-line developer tools, and it will automatically make installed apps available via [`$PATH`](https://en.wikipedia.org/wiki/PATH_(variable)). Other types of apps are also available, but require a bit of configuration (essentially, you just need to "register" additional app repositories).

## Installing Scoop

Scoop is installed via PowerShell, and is itself mainly a suite of PowerShell scripts. It requires PowerShell 5 and .NET Framework 4.5 (minimum); the install script will check for these dependencies and will tell you exactly what's missing, if anything. 

The PowerShell script below will ask for permission for the current user to execute remote signed PowerShell scripts - the [`Set-ExecutionPolicy`](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.security/set-executionpolicy?view=powershell-7) command is idempotent so it doesn't hurt to run it even if the policy is already in place - although it will still ask for confirmation every time. Because it only affects the current user, it should not require an admin shell.

The second command actually downloads and executes [the install script](https://get.scoop.sh). Thanks to the policy, only _signed_ scripts can be executed - although during a cursory examination of the docs I couldn't make out exactly what is signed and how.

```ps
Set-ExecutionPolicy RemoteSigned -scope CurrentUser
Invoke-Expression (New-Object System.Net.WebClient).DownloadString('https://get.scoop.sh')
scoop --version # just making sure it's installed
```

## Command Line Interface

Scoop has a git-like command line interface - one `scoop` "main" binary which supports sub-commands. One such sub-command is `help` - without any arguments, it will provide a high-level overview of all available sub-commands; if given a sub-command as a parameter, `help` will output help specific to it. To save you some keystrokes and give you an idea of what Scoop is about, I've included some output below.

```
$ scoop help
Usage: scoop <command> [<args>]

Some useful commands are:

alias       Manage scoop aliases
bucket      Manage Scoop buckets
cache       Show or clear the download cache
checkup     Check for potential problems
cleanup     Cleanup apps by removing old versions
config      Get or set configuration values
create      Create a custom app manifest
depends     List dependencies for an app
export      Exports (an importable) list of installed apps
help        Show help for a command
hold        Hold an app to disable updates
home        Opens the app homepage
info        Display information about an app
install     Install apps
list        List installed apps
prefix      Returns the path to the specified app
reset       Reset an app to resolve conflicts
search      Search available apps
status      Show status and check for new app versions
unhold      Unhold an app to enable updates
uninstall   Uninstall an app
update      Update apps, or Scoop itself
virustotal  Look for app's hash on virustotal.com
which       Locate a shim/executable (similar to 'which' on Linux)


Type 'scoop help <command>' to get help for a specific command.
```

## Buckets And Manifests

Scoop calls its repositories ["buckets"](https://github.com/lukesampson/scoop/wiki/Buckets). There are, indeed, multiple ones and it is easy to [create your own](https://github.com/lukesampson/scoop/wiki/Creating-an-app-manifest). Only one bucket is available by default, [the "main" Scoop bucket](https://github.com/ScoopInstaller/Main). Scoop is primarily intended for managing command-line utilities, and that's the type of applications one can get from the main bucket.

A bucket is a git repository consisting mainly of a bunch of JSON files - one JSON for every app that is in the respective bucket. These files are called ["manifests"](https://github.com/lukesampson/scoop/wiki/App-Manifests) and each one describes a specific version of the app - normally latest stable. A manifest contains URLs from which to download the app - which could be a single executable, a PowerShell script, or a zip/7zip archive. It can also be an MSI installer, as Scoop knows how to unpack it and essentially treats it as an archive.

To install apps from buckets other than the main one, first they must be added with the `bucket add` command. It takes two parameters - a name and a git url, which Scoop will clone. Some buckets are "well-known" and you don't have to specify a full url; these can be listed with the `scoop bucket known` command:

```sh
$ scoop bucket known
main        # the main bucket - built-in, no need to add it
extras      # a lot of the good stuff is here - inkscape, keepass, obs-studio, shutup10, vlc, ...
versions    # versions other than latest stable and nightly - generally, older stable versions
nightlies   # bleeding edge versions
nonportable # apps that modify the registry or have own data
nirsoft     # apps from http://nirsoft.net/ (system utilities)
nerd-fonts
games
jetbrains
java
php
```

Many more buckets are available, some are listed here: https://github.com/rasa/scoop-directory/blob/master/by-score.md; the list includes the official, well-known buckets but also many "private" ones, in the sense that they are created and maintained by individuals for their own private use. To add buckets:

```sh
$ scoop bucket add extras # add a well-known bucket
$ scoop bucket add alt-nirsoft https://github.com/MCOfficer/scoop-nirsoft.git # alternative nirsoft bucket
```

## Finding Apps

Scoop includes the `search` sub-command, which can be used to find packages. First it will look in buckets that have been added, and it can't find a match it will look in other "well-known" buckets. If there's still no match, tough luck - it _could_ be in one of the dozens of third-party buckets but `search` only searches the "well known" ones.

Also, even though manifests often include a "description" field, it is not used by the `search` command - so you have to know at least part of the apps name.

```
$ scoop search vim
'main' bucket:
    gow (0.8.0) --> includes 'vim.exe'
    neovim (0.4.3)
    vim-nightly (8.2.0158)
    vim (8.2)
```

Without any parameters, `search` will dump a list of all apps from all added buckets - which can be a lot of output so use with care.

## Installing Apps

```
$ scoop install vim
```

Each installed app gets it's own folder, further divided into a separate folder for each version and [a "current" folder](https://github.com/lukesampson/scoop/wiki/The-'Current'-Version-Alias) that is a shortcut to the folder containing the most recent version. To avoid polluting your `$PATH` with a separate entry for each app, Scoop justs adds one folder, `$HOME/scoop/shims`, and places a "shim" for each app there. Some apps have multiple executables; `vim`, for example, includes `vim`, `gvim` and others - they will all be "shimmed" and available on the command line. This is illustrated below; some output is omitted for clarity.

```
$ ls -la $HOME/scoop/apps/vim/
drwxr-xr-x 1 Mihai 197121  0 Dec 12 07:25 8.1.2424
drwxr-xr-x 1 Mihai 197121  0 Jan  1 13:31 8.2
lrwxrwxrwx 1 Mihai 197121 33 Jan  1 13:31 current -> /c/Users/Mihai/scoop/apps/vim/8.2

$ ls -la $HOME/scoop/shims
-rwxr-xr-x 1 Mihai 197121 7680 May 29  2019  gvim.exe
-rw-r--r-- 1 Mihai 197121  264 Jan  1 13:31  gvim.ps1
-rw-r--r-- 1 Mihai 197121   58 Jan  1 13:31  gvim.shim
-rwxr-xr-x 1 Mihai 197121 7680 May 29  2019  vim.exe
-rw-r--r-- 1 Mihai 197121  263 Jan  1 13:31  vim.ps1
-rw-r--r-- 1 Mihai 197121   57 Jan  1 13:31  vim.shim
```

When trying to install an app, you might get an error about the requirement for `7zip` or other dependencies, which seems to contradict the earlier statement that app dependencies are installed automatically. But `7zip` would be an _install-time_ dependency, which is different from a _run-time_ one, and install-time dependencies are not installed automatically. Maybe they should be, but they're not.

## Shims

For each shimmed executable, Scoop creates three files. The `.shim` is a simple text file containing the path to the executable and optional arguments. The `.exe` will parse it, and actually run the executable specified in the `.shim` file, with the specified arguments - so it works similarly to a symbolic link. Actual symbolic links are probably not used because creating them in Windows requires admin privileges. The `.ps1` file is like the `.exe`, but in PowerShell.

## Docker

There is a `docker` app in the main bucket - but keep in mind it's just the CLI and doesn't include a container runtime; more in [the official docs](https://github.com/lukesampson/scoop/wiki/Docker). For a fully functional environment, you also need `docker-machine`. If you get an error like this one:

```
$ docker ps
error during connect: Get http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.40/containers/json: open //./pipe/docker_engine: The system cannot find the file specified. In the default daemon configuration on Windows, the docker client must be run elevated to connect. This error may also indicate that the docker daemon is not running.
```
Then make sure `docker-machine` is running and the required environment variables used by `docker`, like `DOCKER_HOST`, are set correctly:

```sh
$ docker-machine start # to make sure it's running

$ docker-machine env # it generates the correct env vars ...
export DOCKER_TLS_VERIFY="1"
export DOCKER_HOST="tcp://192.168.99.101:2376"
export DOCKER_CERT_PATH="C:\Users\Mihai\.docker\machine\machines\default"
export DOCKER_MACHINE_NAME="default"
export COMPOSE_CONVERT_WINDOWS_PATHS="true"
# Run this command to configure your shell:
# eval $("C:\Users\Mihai\scoop\apps\docker-machine\current\docker-machine.exe" env)

$ eval $(docker-machine env) # ... but they must be eval-ed to be available in the current shell
```
## Updating

When you run `scoop update`, without any arguments Scoop will update itself and will also update all added buckets - remember, buckets are just `git` repositories so essentially Scoop just does a `git pull` behind the scenes, to refresh the local copies.

```
$ scoop update
Updating Scoop...
Updating 'extras' bucket...
 * e0a544cf keepass-plugin-keetraytotp: Update to version 0.101-Beta     3 minutes ago
 * 77d7ebf9 streamlink-twitch-gui: Update to version 1.9.1               64 minutes ago
 * 1318b316 github: Update to version 2.3.1                              2 hours ago
Updating 'main' bucket...
 * 51a8d698 drone: Update to version 1.2.1                               3 minutes ago
 * cba89180 yubico-piv-tool: Update to version 2.0.0                     2 hours ago
 * f261ac22 nomad: Update to version 0.10.3                              3 hours ago
Scoop was updated successfully!
```
Apps can be updated individually, or `*` can be used to update all installed apps; note the quotes around `*`, to [prevent expansion](https://stackoverflow.com/a/11456496/447661) by the shell.

```sh
$ scoop update vim git # updates `vim` and `git` apps
$ scoop update "*" # updates all apps 
```
When an update is available, Scoop will download the new version to a new folder, and update the "current" shortcut to point to it. The older version isn't uninstalled automatically, and with time these can add up - use `scoop cleanup` to get rid of them.

## It's Not Perfect

My biggest gripe with it the extra step of adding the `extras` bucket. If you start using a command-line app manager, chances are you'd want to use it for other things in addition to the dev tools in the `main` bucket; this segregation hurts UX in my opinion and I don't see a good reason for not merging `main` with `extras`, `versions` and perhaps `nightlies` - although it might not be practical for technical reasons which I'm not aware of.

Some commands could use more documentation - for example, to me it's unclear when `search` searches buckets other than the added ones. There is official, online documentation provided as a GitHub wiki - personally I'm not a fan of this format as it's not easily searchable, and sliced up into many tiny documents which I find irksome to navigate - just a pet peeve of mine, not really a problem with Scoop.

Another issue that isn't really a problem with Scoop is that it's problematic to use it with self-updating apps like Firefox, Chrome or VS Code; while there are manifests which allow installing them, they won't work as well because regardless of the version, they will self-update when launched - and even when disabling auto-updates is possible, sometimes it's not desirable for security reasons. For this type of apps I use [Ninite](https://ninite.com/).

## Conclusion

Scoop is a valuable tool and saves a lot of time. It's the best app manager for Windows at the moment and I find it indispensable. It seems to be working quite well, I didn't run into any major flaws yet.