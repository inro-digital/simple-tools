# Timers

There are a few different and popular uses for timers, so let's try to handle most of them.

We should share as much API as possible. However, we should handle the logic of these timers separately because, while timer logic CAN be shared, handling the the different states between timer types is a big enough hassle that it makes the shared logic not worth it.

- Countdown / Kitchen
- Interval / Pomodoro
- Stopwatch
