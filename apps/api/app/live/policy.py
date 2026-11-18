"""The numbers ADR 0041 fixes for live classes. Changing one needs a new decision record."""

from datetime import timedelta

from app.auth.policy import Limit

# The one PostgreSQL channel every API container listens on.
CHANNEL = "pa_live"
# PostgreSQL refuses NOTIFY payloads of 8,000 bytes or more; stay well under.
MAX_NOTIFY_BYTES = 7000

# A bench sends its summary at most this often; faster ones are merged and the latest kept.
BENCH_EVERY = timedelta(seconds=2)
# A student is "here now" if their bench was heard from this recently.
HERE_WINDOW = timedelta(seconds=60)
# A heartbeat moves last_seen_at forward at most this often, to keep writes low.
SEEN_EVERY = timedelta(seconds=20)
# How often an open socket checks its sign-in is still good.
RECHECK_EVERY = timedelta(minutes=5)

# A socket that sends more than this many frames in the window is closed.
FRAMES_PER_WINDOW = 30
FRAME_WINDOW = timedelta(seconds=10)
MAX_FRAME_BYTES = 8 * 1024
# Messages waiting for a slow socket; past this the socket is closed and must reconnect.
QUEUE_LIMIT = 256

MAX_MISTAKES = 10
MAX_TEXT = 280
LESSON_MINUTES_DEFAULT = 40
# Catch-up after a reconnect sends at most this many messages, the newest.
CATCH_UP_LIMIT = 100

# Benches and messages are removed this long after their session ends.
KEEP_ENDED_SESSIONS = timedelta(days=30)

# Teacher commands (hint push, lock, broadcast, note, undo) per teacher.
LIVE_COMMANDS_PER_TEACHER = Limit("live-command:user", 60, timedelta(minutes=1))

# WebSocket close codes in the 4000 range are the application's own.
CLOSE_SIGNED_OUT = 4401
CLOSE_FORBIDDEN = 4403
CLOSE_NOT_FOUND = 4404
CLOSE_TOO_FAST = 4429
CLOSE_TOO_SLOW = 4408
