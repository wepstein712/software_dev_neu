# Phase 6: Testing Task

## `xserver`

### Arguments

You may specify the IP address and port as arguments, but defaults are provided as `127.0.0.1` and `8000`, respectively.

### Notes

The program will output the log messages both in the terminal window and in an `xserver.log` file (stored in the directory it is run).

### Command

```sh
$ ./xserver

# or

$ ./xserver 123.4.5.6 1234
```

## `xclient`

### Arguments

You _must_ specify the IP address and port for the server to connect to, and the name and strategy of your client player.

Names must be alphanumeric and can include underscores.

Strategies must be one of the following:

- `dumb`

### Notes

The program will write pretty messages to the terminal alerting the player of what's happening.

### Command

```sh
$ ./xclient 127.0.0.1 8000 jim_halpert dumb
```

## `xrun`

### Arguments

You may specify the IP address and port for the server as arguments, but defaults are provided as `127.0.0.1` and `8000`, respectively.

The client names and strategies (in the format given by the assignment) are then collected via STDIN, or can be passed with a pipe (example below).

### Notes

The program will only write to the terminal if an error has occurred (too few or too many players). Otherwise, all server logs can be found in the
`xrun.log` file (stored in the directory it is run).

### Command

```js
// xrun-test.json
[
  {
    name: 'rebecca',
    strategy: 'dumb',
  },
  {
    name: 'josh_chan',
    strategy: 'dumb',
  },
  {
    name: 'greg',
    strategy: 'dumb',
  },
];
```

```sh
$ ./xrun # and then STDIN for clients

# or

$ ./xrun 127.0.0.1 8000 # and then STDIN for clients

# or

$ ./xrun < ./xrun-test.json
```
