"""The numbers ADR 0038 fixes. Changing one needs a new decision record."""

from datetime import timedelta

TEACHER_SESSION_IDLE = timedelta(days=7)
TEACHER_SESSION_MAX = timedelta(days=30)
STUDENT_SESSION_IDLE = timedelta(days=90)
STUDENT_SESSION_MAX = timedelta(days=365)
# A session's idle end moves forward at most this often, to keep writes low.
SESSION_TOUCH_EVERY = timedelta(minutes=1)

EMAIL_LINK_LIFETIME = timedelta(minutes=15)
OAUTH_STATE_LIFETIME = timedelta(minutes=10)
REJOIN_CODE_LIFETIME = timedelta(hours=24)

# Six characters from an alphabet with no look-alikes (no 0, O, 1, I or L).
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
CLASS_CODE_LENGTH = 6
REJOIN_CODE_LENGTH = 8

DISPLAY_NAME_MIN = 2
DISPLAY_NAME_MAX = 24


class Limit:
    """At most `hits` in each fixed window of `window`."""

    def __init__(self, name: str, hits: int, window: timedelta) -> None:
        self.name = name
        self.hits = hits
        self.window = window


EMAIL_LINKS_PER_EMAIL = Limit("email-link:email", 5, timedelta(hours=1))
EMAIL_LINKS_PER_ADDRESS = Limit("email-link:ip", 30, timedelta(hours=1))
GOOGLE_STARTS_PER_ADDRESS = Limit("google-start:ip", 30, timedelta(minutes=10))
# Only wrong codes count: a whole school class often shares one network address.
WRONG_CODES_PER_ADDRESS = Limit("wrong-code:ip", 20, timedelta(minutes=10))

# Sync (ADR 0039).
SYNC_MAX_ATTEMPTS = 20
SYNC_MAX_EVENTS = 2000
SYNC_MAX_EVENT_DATA_BYTES = 16 * 1024
SYNC_PULL_PAGE = 500
# A pull page stops early once its events' data reaches this many bytes.
SYNC_PULL_MAX_BYTES = 2 * 1024 * 1024
# What one owner (a student, or a teacher's own work) may add in a UTC day, counting new events
# only, so a retried push costs nothing twice (ASVS review, finding D). A lesson's worth of
# experiments is a small part of either.
SYNC_EVENTS_PER_DAY = Limit("sync-events:owner", 5000, timedelta(days=1))
SYNC_BYTES_PER_DAY = Limit("sync-bytes:owner", 20 * 1024 * 1024, timedelta(days=1))
# A class is closed to new students at this size (finding D).
CLASS_MEMBER_LIMIT = 200
# The longest one statement of a teacher's dashboard may run (finding D).
TEACHER_STATEMENT_TIMEOUT_MS = 5000
# No request body may be larger (sync pushes are the only big ones).
MAX_BODY_BYTES = 2 * 1024 * 1024

# Deleting an account needs a sign-in this recent, as well as the typed email (ADR 0042).
DELETE_ACCOUNT_RECENT_SIGN_IN = timedelta(hours=1)
# Data export pages (ADR 0042): at most this many attempts, stopping early once their events'
# data passes this many bytes. An attempt is never split, so one larger attempt is a page alone.
EXPORT_PAGE_ATTEMPTS = 20
EXPORT_PAGE_MAX_BYTES = 2 * 1024 * 1024

# Anonymous usage counts (ADR 0048). No sign-in, so the limits are per network address.
USAGE_MAX_BODY_BYTES = 32 * 1024
USAGE_MAX_BATCH = 50
USAGE_EVENTS_PER_ADDRESS = Limit("usage-events:ip", 600, timedelta(hours=1))
# Rows are kept this many months, so a year can be compared with the one before.
USAGE_KEEP_MONTHS = 13
