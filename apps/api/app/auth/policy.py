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
SYNC_PULL_PAGE = 2000
