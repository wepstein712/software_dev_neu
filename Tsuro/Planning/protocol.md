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

| Description       | Action           | Payload                                           |
| ----------------- | ---------------- | ------------------------------------------------- |
| set color         | `color`          | `{ id: string, color: string, strategy: string }` |
| turn status       | `is_turn`        | `isTurn: boolean`                                 |
| deal hand         | `new_hand`       | `tileIndices: string[]`                           |
| prompt for action | `request_action` | `isInitial: boolean`                              |
| clear hand        | `dump_hand`      |                                                   |
| remove player     | `lose`           | `forLegalMove: boolean`                           |
| update state      | `update_view`    | `state: BoardState`                               |
| game over         | `game_over`      | `{ winners: string[][], losers: string[] }`       |
| deny entry        | `fail_conn`      | `message: string`                                 |

### Client

These are actions that would be sent from the client to the server.

| Description | Action          | Payload  |
| ----------- | --------------- | -------- |
| send action | `submit_action` | `Action` |
