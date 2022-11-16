# z/OS plugin

z/OS plugin provides basic functionalities to manage job/data set/USS file on on z/OS.


## Command

#### Form: `zos [scope] [resource] [verb] [object] [adjectives...]`

#### synopsis: 
```
zos job list status  [jobId] --owner | o <owner> --prefix | p <prefix> --limit <limit>
zos dataset list status [datasetName*] --dsname-level | dl <dsnamelevel> --volume-serial | vs <volumeserial> --start | s <firstDatasetName> --limit <limit>
zos dataset list member [datasetMemberName*] --dataset-name | dn <datasetName> --limit <limit>
zos file list status [fileName*] --path | p <path> --limit <limit>
zos file list mounts [fileSystemName*] --mount-point | mp <mount-point-path> --limit <limit>
zos help list command [resourceName]
```



