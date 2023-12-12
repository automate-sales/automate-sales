oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![GitHub license](https://img.shields.io/github/license/oclif/hello-world)](https://github.com/oclif/hello-world/blob/main/LICENSE)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g cli
$ automate COMMAND
running command...
$ automate (--version)
cli/0.0.0 darwin-arm64 node-v20.7.0
$ automate --help [COMMAND]
USAGE
  $ automate COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`automate hello PERSON`](#automate-hello-person)
* [`automate hello world`](#automate-hello-world)
* [`automate help [COMMANDS]`](#automate-help-commands)
* [`automate plugins`](#automate-plugins)
* [`automate plugins:install PLUGIN...`](#automate-pluginsinstall-plugin)
* [`automate plugins:inspect PLUGIN...`](#automate-pluginsinspect-plugin)
* [`automate plugins:install PLUGIN...`](#automate-pluginsinstall-plugin-1)
* [`automate plugins:link PLUGIN`](#automate-pluginslink-plugin)
* [`automate plugins:uninstall PLUGIN...`](#automate-pluginsuninstall-plugin)
* [`automate plugins reset`](#automate-plugins-reset)
* [`automate plugins:uninstall PLUGIN...`](#automate-pluginsuninstall-plugin-1)
* [`automate plugins:uninstall PLUGIN...`](#automate-pluginsuninstall-plugin-2)
* [`automate plugins update`](#automate-plugins-update)

## `automate hello PERSON`

Say hello

```
USAGE
  $ automate hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/gkpty/automate-biz/blob/v0.0.0/src/commands/hello/index.ts)_

## `automate hello world`

Say hello world

```
USAGE
  $ automate hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ automate hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/gkpty/automate-biz/blob/v0.0.0/src/commands/hello/world.ts)_

## `automate help [COMMANDS]`

Display help for automate.

```
USAGE
  $ automate help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for automate.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.20/src/commands/help.ts)_

## `automate plugins`

List installed plugins.

```
USAGE
  $ automate plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ automate plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.10/src/commands/plugins/index.ts)_

## `automate plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ automate plugins add plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -s, --silent   Silences yarn output.
  -v, --verbose  Show verbose yarn output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ automate plugins add

EXAMPLES
  $ automate plugins add myplugin 

  $ automate plugins add https://github.com/someuser/someplugin

  $ automate plugins add someuser/someplugin
```

## `automate plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ automate plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ automate plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.10/src/commands/plugins/inspect.ts)_

## `automate plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ automate plugins install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -s, --silent   Silences yarn output.
  -v, --verbose  Show verbose yarn output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ automate plugins add

EXAMPLES
  $ automate plugins install myplugin 

  $ automate plugins install https://github.com/someuser/someplugin

  $ automate plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.10/src/commands/plugins/install.ts)_

## `automate plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ automate plugins link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ automate plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.10/src/commands/plugins/link.ts)_

## `automate plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ automate plugins remove plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ automate plugins unlink
  $ automate plugins remove

EXAMPLES
  $ automate plugins remove myplugin
```

## `automate plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ automate plugins reset
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.10/src/commands/plugins/reset.ts)_

## `automate plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ automate plugins uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ automate plugins unlink
  $ automate plugins remove

EXAMPLES
  $ automate plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.10/src/commands/plugins/uninstall.ts)_

## `automate plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ automate plugins unlink plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ automate plugins unlink
  $ automate plugins remove

EXAMPLES
  $ automate plugins unlink myplugin
```

## `automate plugins update`

Update installed plugins.

```
USAGE
  $ automate plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.10/src/commands/plugins/update.ts)_
<!-- commandsstop -->
