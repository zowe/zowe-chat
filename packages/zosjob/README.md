# z/OS job plugin

z/OS job plugin provides basic functionalities to manage job on on z/OS.


## Command

#### Form: `zos [scope] [resource] [verb] [object] [adjectives...]`

#### Example: `zos job list job --owner NANCY --limit 5`

### Table of Contents
* [job](#job)
	* [list](#job-list)


# job<a name="job"></a>
Manage z/OS jobs.
## list <a name="job-list"></a>
### job<a name="job-list-job"></a>
List jobs on JES spool/queues\. By default, the command lists jobs owned (owner)
by the user specified for authentication\. The default for prefix is "\*"\.

#### Usage

   zos job list job [adjectives]

#### Adjectives

*   `--owner`  | `-o` *(string)*

	* Specify the owner of the jobs you want to list\. The owner is the user who submitted the job OR the user ID assigned to the job\. According to the z/OSMF Jobs REST endpoint documentation, wildcard is supported, and it is usually in the form "USER\*"\.

*   `--prefix`  | `-p` *(string)*

	* Specify the prefix of the job name\. According to the z/OSMF Jobs REST endpoint documentation, wildcard is supported, and it is usually in the form "JOB\*"\.

*   `--id` *(string)*

	* Specify the z/OS job id\.
  
*   `--limit` *(number)*

	* Specify the number of the returned jobs you want to list\. It is a positive integer\.


#### Zosmf Connection
Since limitation of character length of chat tool select menu or dropdown, Zosmf connection information could not be passed as adjective in select menu/dropdown option value, z/OS job plugin will integrate with Zowe Chat authentication later. Currently, you need to change Zosmf Connection information in file \'src/command/list/ZosJobListHandler.ts\' to your credential. 

#### Examples

*  List all jobs with default settings. The command returns all jobs owned by user specified for authentication:

      * `$  zos job list job`

*  List all jobs owned by user IDs that start with 'bo' and job names that start with 'om':

      * `$  zos job list job  -o "bo*" -p "om*"`

*  List first 5 jobs with default owner and prefix settings:

      * `$  zos job list job --limit 5`