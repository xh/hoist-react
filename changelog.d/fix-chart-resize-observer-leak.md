### 🐞 Bug Fixes

* Fixed `Chart` leaving one Highcharts resize observer behind on each rebuild, such as a change to
  `highchartsConfig`. Each one ran on every resize for as long as the chart was mounted.
