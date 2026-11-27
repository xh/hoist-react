### 🐞 Bug Fixes

* Fixed `BaseOAuthClient` auto-refresh to skip lazy access tokens until the app first loads them.
  The timer previously requested every configured token, including lazy tokens a user may not be
  permitted to get.
