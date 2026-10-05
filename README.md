# Household calendar digest: a runnable, local n8n demo

This proof of concept turns **synthetic calendar events** into a plain-text daily draft and flags overlapping appointments. It is a portfolio sample, not a deployed household system or evidence of previous client work. It was built and tested by an AI coding assistant acting for Oleksii Marchenko.

## Try it

1. Import `household-digest.n8n.json` into a disposable local n8n instance.
2. Run the manual trigger.
3. Open **Validate and prepare local draft** to see the output.

No account credentials, calendar connection, paid API or language model is needed. The workflow has only a manual trigger and two Code nodes. It contains no network or send nodes. Use the supplied fictional events when evaluating it.

[View the sample output](sample-output.txt) · [Workflow JSON](household-digest.n8n.json) · [Test cases](test.cjs)

## What it demonstrates

- A daily view using an explicit IANA time zone.
- Timed events, overnight events and all-day events with exclusive end dates.
- Cancelled events omitted; duplicate source IDs handled within the input batch.
- Conflicting versions of the same source event stop for review rather than silently picking one.
- Actual time overlap detection, including the repeated hour when daylight saving time ends.
- Only a minimal set of fields retained: title, source identity and times. Descriptions, attendees and locations are not copied to the draft. Titles may still contain private information.
- A draft for review, with no automatic sending or calendar modifications.

## Verified

On 5 October 2026:

- 15 focused checks passed with Node.js 22.23.3 (`node test.cjs`).
- The exported workflow was imported and executed successfully in **n8n 2.41.6**, using its official Docker image and a fresh, disposable database.
- The test container had `--network none`, no published ports and a read-only mount of this sample. The execution therefore needed no outbound network connection.
- n8n's resulting draft matched `verified-output.json` exactly.

Image used: `docker.n8n.io/n8nio/n8n:2.41.6`, digest `sha256:87e0bab2c93192e8dd885ff7b0697c22a1bd97489568a8c67cc140fd7dbb342d`.

Rebuild sample files with `node build.cjs`, then run `node test.cjs`. An n8n Docker verification can use a fresh container with this directory mounted at `/work` (read-only), import with `n8n import:workflow --input=/work/household-digest.n8n.json`, then execute with `n8n execute --id=householdDigestDemo --rawOutput` in that same container. See the [official Server CLI documentation](https://github.com/n8n-io/n8n-docs/blob/main/docs/deploy/host-n8n/configure-n8n/use-the-command-line.md).

## Limits and next integration step

This demo **does not fetch Google Calendar events, expand recurrence rules, call Notion/Ollama, create Gmail drafts, or run on a schedule**. Live authentication and API behavior have not been tested. Input must contain already expanded event instances, with an explicit UTC offset for timed events. The input is limited to 1,000 events per run. Cross-calendar copies can be flagged as conflicts. The draft needs human review.

A separately agreed pilot could connect one read-only calendar and prepare a local daily draft in a client-controlled n8n instance. Permissions, hosting, pagination, recurrence expansion, retries, duplicate-run handling, log retention and acceptance tests would need to be agreed and checked before production use. Cloud storage and sending would remain separate decisions. Do not paste sensitive family documents or credentials into an issue or this repository.

The workflow disables saved successful, failed and manual execution data in its settings. This does not establish privacy for an entire n8n installation: a real deployment also needs review of logs, backups, access permissions and host settings.
