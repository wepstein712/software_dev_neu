# Server/Client Interaction Protocol

The following is the interaction protocol between the server and the client(s).

## Actions

The following is the interface shape for a basic TCP message.

```ts
interface Message {
  action: string;
  payload: any;
}
```

An example is as follows:

```json
{
  "action": "color",
  "payload": {
    "id": "jim",
    "color": "blue",
    "strategy": "dumb"
  }
}
```

### Server

These are actions that would be sent from the server to the client.

| Description       | Action            | Payload                                     |
| ----------------- | ----------------- | ------------------------------------------- |
| set unique name   | `set_unique_name` | `uniqueId: string`                          |
| set color         | `set_color`       | `{ id: string, color: string }`             |
| turn status       | `is_turn`         | `isTurn: boolean`                           |
| deal hand         | `new_hand`        | `tileIndices: string[]`                     |
| prompt for action | `request_action`  | `isInitial: boolean`                        |
| clear hand        | `dump_hand`       |                                             |
| remove player     | `lose`            | `forLegalMove: boolean`                     |
| update state      | `update_view`     | `state: BoardState`                         |
| game over         | `game_over`       | `{ winners: string[][], losers: string[] }` |
| deny entry        | `fail_conn`       | `message: string`                           |
| invalid json      | `invalid_json`    |                                             |
| unknown action    | `unknown_action`  |                                             |
| invalid ID        | `invalid_id`      | `reason: string`                            |
| unknown strategy  | `unknown_strat`   | `reason: string`                            |

### Client

These are actions that would be sent from the client to the server.

| Description     | Action          | Payload                            |
| --------------- | --------------- | ---------------------------------- |
| register client | `register`      | `{ id: string, strategy: string }` |
| send action     | `submit_action` | `Action`                           |

## Interaction Diagram

```
referee         player: P-1 ... ... player P-N
       |                |                  |
       | <==============|                  |    register: P-1, strategy
       |--------------> |                  |    set_unique_name: P-1
       |--------------> |                  |    set_color: P-1, color1
       |                |                  |
       .                .                  .
       |                |                  |
       | <=================================|    register: P-N, strategy
       |---------------------------------> |    set_unique_name: P-N
       |---------------------------------> |    set_color: P-N, colorN
       |---------------------------------> |    set_color: P-1, color1
       |--------------> |                  |    set_color: P-N, colorN
       |                |                  |
       .                .                  .
       |                |                  |
       |--------------> |                  |    update_view: boardState
       |--------------> |                  |    is_turn: true
       |--------------> |                  |    new_hand: tileIndex[]
       |--------------> |                  |    request_action: true
       | <==============|                  |    send_action: tileIndex, coords
       |--------------> |                  |    dump_hand
       |--------------> |                  |    is_turn: false
       |--------------> |                  |    update_view: boardState
       |---------------------------------> |    update_view: boardState
       |                |                  |
       .                .                  .
       |                |                  |
       |---------------------------------> |    update_view: boardState
       |---------------------------------> |    is_turn: true
       |---------------------------------> |    new_hand: tileIndex[]
       |---------------------------------> |    request_action: true
       | <=================================|    send_action: tileIndex, coords, position
       |---------------------------------> |    dump_hand
       |---------------------------------> |    is_turn: false
       |---------------------------------> |    update_view: boardState
       |--------------> |                  |    update_view: boardState
       |                |                  |
       .                .                  .
       |                |                  |
       |--------------> |                  |    update_view: boardState
       |--------------> |                  |    is_turn: true
       |--------------> |                  |    new_hand: tileIndex[]
       |--------------> |                  |    request_action: false
       | <==============|                  |    send_action: tileIndex, coords, position
       |--------------> |                  |    dump_hand
       |--------------> |                  |    is_turn: false
       |--------------> |                  |    update_view: boardState
       |---------------------------------> |    update_view: boardState
       |                |                  |
       .                .                  .
       |                |                  |
       |---------------------------------> |    update_view: boardState
       |---------------------------------> |    is_turn: true
       |---------------------------------> |    new_hand: tileIndex[]
       |---------------------------------> |    request_action: false
       | <=================================|    send_action: tileIndex, coords
       |---------------------------------> |    dump_hand
       |---------------------------------> |    is_turn: false
       |---------------------------------> |    update_view: boardState
       |--------------> |                  |    update_view: boardState
       |                |                  |
       .                .                  .
       .                .                  .
       .                .                  .
       |                |                  |
       |---------------------------------> |    update_view: boardState
       |---------------------------------> |    is_turn: true
       |---------------------------------> |    new_hand: tileIndex[]
       |---------------------------------> |    request_action: false
       | <=================================|    send_action: tileIndex, coords
       |---------------------------------> |    lose: true (false, if illegal move or disconnect)
       |---------------------------------> |    dump_hand
       |---------------------------------> |    is_turn: false
       |---------------------------------> |    update_view: boardState
       |--------------> |                  |    update_view: boardState
       |                |                  |
       .                .                  .
       .                .                  .
       .                .                  .
       |                |                  |
       |--------------> |                  |    game_over: winners, losers
       |---------------------------------> |    game_over: winners, losers
```
