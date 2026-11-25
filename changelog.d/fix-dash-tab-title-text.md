### 🐞 Bug Fixes

* Fixed `DashContainer` tabs parsing view titles as HTML. Markup in a title, such as a user's
  rename restored from saved or shared state, could run script. Tabs now show titles as text.
