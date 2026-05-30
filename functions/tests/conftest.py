"""Shared test setup.

`main` calls `firebase_admin.initialize_app()` at import time, which would try
to resolve Application Default Credentials. Tests never touch real Firebase, so
we neutralize it before any test module imports `main`.
"""

import os
import sys
import unittest.mock as mock

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Started (not stopped) on purpose: stays active for the whole test session.
mock.patch("firebase_admin.initialize_app").start()
