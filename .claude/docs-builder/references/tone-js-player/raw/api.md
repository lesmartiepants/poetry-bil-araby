# Tone.Player — API reference (official docs)

Source: https://tonejs.github.io/docs/ (Player class) + Tonejs/Tone.js source
`Tone/source/buffer/Player.ts`. `Player extends Source<PlayerOptions>`.
"An audio file player with start, loop, and stop functions."

## Constructors

Two overloads:

```ts
new Player(url?: string | AudioBuffer | ToneAudioBuffer, onload?: () => void): Player
new Player(options?: Partial<PlayerOptions>): Player
```

- `url` — the AudioBuffer or the URL to load it from.
- `onload` — invoked once the buffer is loaded (constructor form).
- Implementation: `optionsFromArguments(Player.getDefaults(), arguments, ["url", "onload"])`,
  then `super(options)`, creates an internal `ToneAudioBuffer`, and assigns
  `autostart`, `_loop`, `_loopStart`, `_loopEnd`, `_playbackRate`, `fadeIn`, `fadeOut`.

## PlayerOptions interface (with defaults)

| field          | type                                                  | default |
| -------------- | ----------------------------------------------------- | ------- |
| `url`          | `string \| AudioBuffer \| ToneAudioBuffer` (optional) | —       |
| `onload`       | `() => void`                                          | `noOp`  |
| `onerror`      | `(error: Error) => void`                              | `noOp`  |
| `autostart`    | `boolean`                                             | `false` |
| `loop`         | `boolean`                                             | `false` |
| `loopStart`    | `Time`                                                | `0`     |
| `loopEnd`      | `Time`                                                | `0`     |
| `reverse`      | `boolean`                                             | `false` |
| `playbackRate` | `Positive`                                            | `1`     |
| `fadeIn`       | `Time`                                                | `0`     |
| `fadeOut`      | `Time`                                                | `0`     |

PlayerOptions also inherits Source options (e.g. `volume`, `mute`, `onstop`).

## Methods

| method          | signature                                                       | notes                                                                                                                                      |
| --------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `load`          | `load(url: string): Promise<this>`                              | Loads + decodes a new url async. NOT needed if a url was passed to the constructor; use to manually load a new url. Resolves when decoded. |
| `start`         | `start(time?: Time, offset?: Time, duration?: Time): this`      | Play buffer at `time`. With no `duration`, defaults to full length of the sample minus any `offset`. Overrides `Source.start`.             |
| `stop`          | `stop(time?: Time): this`                                       | If no time given, stop now. Inherited from `Source`.                                                                                       |
| `restart`       | `restart(time?: Seconds, offset?: Time, duration?: Time): this` | Stop then restart from the beginning (or offset). Overrides `Source.restart`.                                                              |
| `seek`          | `seek(offset: Time, when?: Time): this`                         | Seek to `offset`. If the source is no longer playing at `when`, it will stop.                                                              |
| `setLoopPoints` | `setLoopPoints(loopStart: Time, loopEnd: Time): this`           | Sets loop boundaries. Only loops if `loop` is true.                                                                                        |
| `dispose`       | `dispose(): this`                                               | Frees resources. Overrides `Source.dispose`.                                                                                               |
| `getDefaults`   | `static getDefaults(): PlayerOptions`                           | Returns default options.                                                                                                                   |

Inherited (Source/ToneAudioNode): `connect`, `disconnect`, `chain`, `fan`,
`toDestination()`, `toMaster()` (deprecated → use `toDestination`), `sync`,
`unsync`, `get()`, `set(props)`, `toSeconds`, `now`, `immediate`.

## Accessors (get/set)

| name           | type                     | r/w     | notes                                                                                            |
| -------------- | ------------------------ | ------- | ------------------------------------------------------------------------------------------------ |
| `buffer`       | `ToneAudioBuffer`        | get/set | The player's audio buffer (`this._buffer.set(buffer)`).                                          |
| `loaded`       | `boolean`                | get     | `this._buffer.loaded` — whether the buffer is loaded.                                            |
| `loop`         | `boolean`                | get/set | If the buffer should loop once it's over. Propagates to active sources, cancels next stop event. |
| `loopStart`    | `Time`                   | get/set | Where the loop starts when `loop` is true. Range-asserted vs buffer duration.                    |
| `loopEnd`      | `Time`                   | get/set | Where the loop ends when `loop` is true.                                                         |
| `playbackRate` | `number` (`Positive`)    | get/set | Normal speed is 1. The pitch changes with the playback rate. Reschedules stop event.             |
| `reverse`      | `boolean`                | get/set | Reads/writes the underlying buffer's reverse flag — affects ALL players sharing that buffer.     |
| `fadeIn`       | `Time`                   | get/set | fadeIn time of the amplitude envelope.                                                           |
| `fadeOut`      | `Time`                   | get/set | fadeOut time of the amplitude envelope.                                                          |
| `autostart`    | `boolean`                | get/set | Play as soon as the buffer is loaded.                                                            |
| `state`        | `"started" \| "stopped"` | get     | Inherited (BasicPlaybackState).                                                                  |
| `progress`     | `Seconds`                | get     | Seconds since start.                                                                             |

## Events / callbacks

- `onload` — constructor callback `() => void`, fired when the buffer finishes loading.
- `onstop` — property (`onStopCallback`), invoked when the source stops (inherited from Source).
- `onerror` — option, invoked on load error.

## Loading multiple / waiting

- `Tone.loaded()` returns a Promise that resolves when ALL audio files (across all
  buffers) have loaded — useful instead of per-player `onload`.
