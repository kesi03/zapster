# Zapr

A comprehensive CLI tool for OWASP ZAP (Zed Attack Proxy) security scanning.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Global Options](#global-options)
- [Commands](#commands)
  - [ZAP Commands (zap)](#zap-commands-zap)
    - [Scan Commands](#scan-commands)
    - [Session Management](#session-management)
    - [Context & User Management](#context--user-management)
    - [Search & Discovery](#search--discovery)
    - [Advanced Proxy Management](#advanced-proxy-management)
    - [Configuration](#configuration-1)
  - [Docker Scan Commands](#docker-scan-commands)
  - [Report Commands](#report-commands)
  - [Azure DevOps Integration](#azure-devops-integration)
  - [Utils Commands](#utils-commands)
- [Workspace & Logging](#workspace--logging)
- [GitHub Actions](#github-actions)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/zapr.git
cd zapr

# Install dependencies
npm install

# Build the project
npm run build

# Link for CLI usage
npm link
```

## Configuration

Zapster can be configured via environment variables or command-line options:

```bash
# Environment variables (.env file)
ZAP_HOST=localhost
ZAP_PORT=8080
ZAP_API_KEY=your-api-key

# Workspace configuration (output directory for logs and reports)
ZAPR_WORKSPACE=./zap-results
```

---

## Global Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--host` | `-H` | `localhost` | ZAP API host |
| `--port` | `-p` | `8080` | ZAP API port |
| `--api-key` | `-k` | (none) | ZAP API key |
| `--workspace` | `-w` | `ZAPR_WORKSPACE` | Output directory for reports and logs |
| `--name` | `-n` | (varies) | Output filename |

---

## Commands

### ZAP Commands (`zap`)

The `zap` command provides access to core ZAP scanning and management functionality.

```bash
zapr zap <subcommand> [options]
```

Available subcommands:
- `base-scan` - Spider Scan
- `active-scan` - Active Scan
- `ajax-scan` - AJAX Spider Scan
- `api-scan` - Full API Scan
- `passive-scan` - Passive Scan Management
- `session` - Manage Sessions
- `context` - Manage Contexts
- `users` - Manage Users
- `search` - Search URLs/Messages
- `forced-browse` - Forced Browsing
- `http-sessions` - Manage HTTP Sessions
- `break` - Manage Break Points
- `proxy` - Proxy Chain Management
- `configure-rules` - Configure Scanning Rules
- `get-report` - Generate Reports
- `get-alerts` - Get Alerts
- `get-version` - Get ZAP Version
- `automate` - Run ZAP Automation

#### `zap base-scan` - Spider Scan

Discover URLs on a target site using the traditional spider.

```bash
zapr zap base-scan --url https://example.com [options]

Options:
  --url, -u              Target URL (required)
  --max-depth            Maximum crawl depth (0 = unlimited)
  --max-children         Limit children scanned (0 = unlimited)
  --recurse              Enable recursion (default: true)
  --poll-interval        Status check interval in ms (default: 2000)
  --timeout              Maximum wait time in ms (default: 300000)
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)

Examples:
  zapr zap base-scan -u https://example.com
  zapr zap base-scan -u https://example.com --max-depth 3 --timeout 600000
  zapr zap base-scan -u https://example.com --workspace ./results
```

#### `zap active-scan` - Active Scan

Run vulnerability testing against a target.

```bash
zapr zap active-scan --url https://example.com [options]

Options:
  --url, -u              Target URL (required)
  --context, -c          Context name for authenticated scanning
  --user-id              User ID for authenticated scanning
  --policy               Scan policy name
  --poll-interval        Status check interval in ms (default: 5000)
  --timeout              Maximum wait time in ms (default: 600000)
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)

Examples:
  zapr zap active-scan -u https://example.com
  zapr zap active-scan -u https://example.com --context myapp --user-id 1
```

#### `zap ajax-scan` - AJAX Spider Scan

Crawl a site using a real browser (Firefox/Chrome).

```bash
zapr zap ajax-scan --url https://example.com [options]

Options:
  --url, -u              Target URL (required)
  --max-duration        Maximum duration in minutes (0 = unlimited)
  --max-crawl-depth      Maximum crawl depth
  --max-crawl-states     Maximum number of states to crawl
  --browser-id           Browser to use (firefox, chrome, chrome-headless)
  --poll-interval        Status check interval in ms (default: 5000)
  --timeout              Maximum wait time in ms (default: 600000)
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)

Examples:
  zapr zap ajax-scan -u https://example.com
  zapr zap ajax-scan -u https://example.com --max-duration 10 --browser-id firefox
```

#### `zap api-scan` - Full API Scan

Run a comprehensive API scan combining spider, passive scan, and active scan in one command.

```bash
zapr zap api-scan --url https://example.com [options]

Options:
  --url, -u              Target URL (required)
  --recurse              Recurse into found URLs (default: true)
  --in-scope-only        Only scan URLs in scope (default: false)
  --context, -c          Context name
  --policy               Scan policy name
  --method               HTTP method to use
  --post-data            POST data to send
  --poll-interval        Status check interval in ms (default: 5000)
  --timeout              Maximum wait time in ms (default: 600000)
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)
  --name, -n            Output filename for report
  --format, -f           Report format: json, html (default: json)

Examples:
  zapr zap api-scan -u https://api.example.com
  zapr zap api-scan -u https://api.example.com --context myapp
  zapr zap api-scan -u https://api.example.com --workspace ./results --name report.json
```

#### `zap passive-scan` - Passive Scan Management

Enable, disable, or check passive scanning status.

```bash
zapr zap passive-scan [options]

Options:
  --enable, -e           Enable passive scanning
  --disable, -d          Disable passive scanning
  --status, -s           Show passive scan status

Examples:
  zapr zap passive-scan --status
  zapr zap passive-scan --enable
```

---

### Docker Scan Commands (`docker`)

Zapster provides Docker-based scan commands that run ZAP in a Docker container using the official ZAP images. These commands are ideal for CI/CD pipelines and require Docker to be installed.

```bash
zapr docker <subcommand> [options]
```

Available subcommands:
- `baseline-scan` - ZAP Baseline Scan
- `full-scan` - ZAP Full Scan
- `api-scan` - ZAP API Scan
- `automate` - Run ZAP Automation
- `pull` - Pull Docker Image
- `get-docker-log` - Get Docker Container Logs
- `start-daemon` - Start ZAP Daemon
- `stop-daemon` - Stop ZAP Daemon

#### `docker baseline-scan` - ZAP Baseline Scan

Run a passive baseline scan that spiders the target for a limited time and checks for common security issues without performing active attacks.

```bash
zapr docker baseline-scan --target <url> [options]

Options:
  --target, -t            Target URL with protocol (required)
  --config-file, -c       Config file to set rules to INFO/IGNORE/FAIL
  --config-url, -u        URL of config file
  --gen-file, -g          Generate default config file
  --spider-mins, -m       Spider duration in minutes (default: 1)
  --report-html, -r       Output HTML report filename
  --report-json, -J       Output JSON report filename
  --report-xml, -x         Output XML report filename
  --include-alpha, -a      Include alpha passive scan rules
  --ajax-spider, -j        Use AJAX spider in addition to traditional spider
  --min-level, -l          Minimum alert level: PASS, IGNORE, INFO, WARN, FAIL
  --timeout-mins, -T       Max time in minutes for scan
  --workspace, -w          Output directory
  --image, -i              ZAP Docker image (default: ghcr.io/zaproxy/zaproxy:stable)
  --network, -n            Docker network mode (default: host)
  --java-options           Java options (default: -Xms4g -Xmx4g -XX:+UseZGC -Xss512k -XX:+UseContainerSupport -XX:MaxRAMPercentage=80)
  --api-key, -k            ZAP API key
  --fail-on-warn, -W       Return failure exit code on warning

Examples:
  zapr docker baseline-scan -t https://example.com
  zapr docker baseline-scan -t https://example.com --report-html report.html --workspace ./results
  zapr docker baseline-scan -t https://example.com --config-url https://example.com/zap.conf
```

**Exit Codes:**
- 0: Success (no issues)
- 1: At least one FAIL
- 2: At least one WARN (no FAILs)
- 3: Other failure

#### `docker full-scan` - ZAP Full Scan

Run a comprehensive scan that includes spidering, AJAX spider, and active scanning with vulnerability testing.

```bash
zapr docker full-scan --target <url> [options]

Options:
  --target, -t            Target URL with protocol (required)
  --config-file, -c       Config file to set rules to INFO/IGNORE/FAIL
  --config-url, -u        URL of config file
  --gen-file, -g          Generate default config file
  --spider-mins, -m       Spider duration in minutes (0 = unlimited)
  --report-html, -r       Output HTML report filename
  --report-json, -J       Output JSON report filename
  --report-xml, -x         Output XML report filename
  --include-alpha, -a      Include alpha scan rules
  --ajax-spider, -j        Use AJAX spider
  --min-level, -l          Minimum alert level
  --timeout-mins, -T       Max time in minutes for scan
  --workspace, -w          Output directory
  --image, -i              ZAP Docker image
  --network, -n            Docker network mode (default: host)
  --java-options           Java options (default: -Xms4g -Xmx4g -XX:+UseZGC -Xss512k -XX:+UseContainerSupport -XX:MaxRAMPercentage=80)
  --api-key, -k            ZAP API key
  --fail-on-warn, -W       Return failure exit code on warning

Examples:
  zapr docker full-scan -t https://example.com
  zapr docker full-scan -t https://example.com --ajax-spider --spider-mins 5
```

#### `docker api-scan` - ZAP API Scan

Scan APIs defined by OpenAPI, SOAP, or GraphQL specifications.

```bash
zapr docker api-scan --target <url> --format <format> [options]

Options:
  --target, -t            Target API definition URL or file (required)
  --format, -f           API format: openapi, soap, graphql (required)
  --config-file, -c       Config file to set rules to INFO/IGNORE/FAIL
  --config-url, -u        URL of config file
  --report-html, -r       Output HTML report filename
  --report-json, -J       Output JSON report filename
  --report-xml, -x         Output XML report filename
  --include-alpha, -a      Include alpha scan rules
  --safe-mode, -S         Skip active scan (baseline only)
  --schema                GraphQL schema location (URL or file)
  --host-override, -O     Override hostname in remote OpenAPI spec
  --min-level, -l          Minimum alert level
  --timeout-mins, -T       Max time in minutes for scan
  --workspace, -w          Output directory
  --image, -i              ZAP Docker image
  --network, -n            Docker network mode (default: host)
  --java-options           Java options (default: -Xms4g -Xmx4g -XX:+UseZGC -Xss512k -XX:+UseContainerSupport -XX:MaxRAMPercentage=80)
  --api-key, -k            ZAP API key
  --fail-on-warn, -W       Return failure exit code on warning

Examples:
  zapr docker api-scan -t https://api.example.com/openapi.json -f openapi
  zapr docker api-scan -t https://example.com/graphql -f graphql
  zapr docker api-scan -t https://example.com/api.wsdl -f soap --safe-mode
```

#### `docker automate` - Run ZAP Automation

Run ZAP automation using a YAML plan file via Docker.

```bash
zapr docker automate --file <plan.yaml> [options]

Options:
  --file, -f              Path to the ZAP automation plan YAML file (required)
  --workspace, -w         Workspace directory (default: current directory)
  --image, -i             ZAP Docker image (default: ghcr.io/zaproxy/zaproxy:stable)
  --network, -n           Docker network mode (default: host)
  --debug, -d             Show debug messages
  --name, -N              Container name
  --timeout-mins, -t      Minutes to wait for automation to complete (default: 30)
  --max-response-size, -M Max response body size in bytes (default: 100MB)
  --java-options          Java options (default: -Xms4g -Xmx4g -XX:+UseZGC -Xss512k -XX:+UseContainerSupport -XX:MaxRAMPercentage=80)
  --api-key, -k           ZAP API key

Examples:
  zapr docker automate --file plan.yaml
  zapr docker automate -f plan.yaml --workspace ./results
```

#### `docker pull` - Pull Docker Image

Pull a Docker image (useful for pre-caching before running scans).

```bash
zapr docker pull --image <image> [options]

Options:
  --image, -i            Docker image to pull (required)
  --tag, -t              Image tag (default: latest)

Examples:
  zapr docker pull --image ghcr.io/zaproxy/zaproxy:stable
```

#### `docker get-docker-log` - Get Docker Container Logs

Fetch logs from a Docker container using the Docker API.

```bash
zapr docker get-docker-log [options]

Options:
  --container, -c        Docker container name or ID
  --image, -i            Docker image name to find container by
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)
  --name, -n             Output filename (default: agent.log)
  --tail, -t             Number of lines to fetch (default: 10000)

Examples:
  zapr docker get-docker-log --container my-container --workspace ./results
  zapr docker get-docker-log --image mockholm/zap-daemon --workspace ./results
```

#### `docker start-daemon` - Start ZAP Daemon

Start a ZAP daemon container that runs in the background and exposes the ZAP API.

```bash
zapr docker start-daemon [options]

Options:
  --image, -i              ZAP Docker image (default: ghcr.io/zaproxy/zaproxy:stable)
  --port, -P              ZAP proxy port (default: 8080)
  --host, -H              ZAP host to bind to (default: 0.0.0.0)
  --api-port, -A          ZAP API port (default: 8080)
  --api-key, -k           API key for ZAP (auto-generated if not provided)
  --debug, -d             Enable debug mode
  --network, -n           Docker network mode or name
  --name, -N              Container name (default: zap-daemon)
  --timeout-mins, -t      Minutes to wait for ZAP to start (default: 1)
  --max-response-size, -M Max response body size in bytes (default: 100MB)
  --java-options             Java options (default: -Xms4g -Xmx4g -XX:+UseZGC -Xss512k -XX:+UseContainerSupport -XX:MaxRAMPercentage=80)

Examples:
  zapr docker start-daemon
  zapr docker start-daemon --port 8090 --api-key my-secret-key
  zapr docker start-daemon --java-options "-Xms2g -Xmx2g" --name my-zap
```

**Default Java Options:**
| Option | Description |
|--------|-------------|
| `-Xms4g` | Initial heap size (4GB) |
| `-Xmx4g` | Maximum heap size (4GB) |
| `-XX:+UseZGC` | Z Garbage Collector (low latency) |
| `-Xss512k` | Thread stack size |
| `-XX:+UseContainerSupport` | Docker container awareness |
| `-XX:MaxRAMPercentage=80` | Use 80% of container memory |

The start-daemon command outputs DevOps variables for Azure DevOps, GitHub Actions, and TeamCity.

#### `docker stop-daemon` - Stop ZAP Daemon

Stop a running ZAP daemon container.

```bash
zapr docker stop-daemon [options]

Options:
  --name, -N              Container name (default: zap-daemon)
  --force, -f             Force stop the container

Examples:
  zapr docker stop-daemon
  zapr docker stop-daemon --name my-zap --force
```

#### `zap forced-browse` - Forced Browsing

Run dirb-style brute-force directory discovery.

```bash
zapr forcedBrowse [options]

Options:
  --scan, -s             Start scan on URL
  --stop                 Stop scan by ID
  --status               Show all forced browse scans
  --context, -c          Context name
  --poll-interval        Status check interval in ms (default: 5000)
  --timeout              Maximum wait time in ms (default: 300000)
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)

Examples:
  zapr forcedBrowse --scan https://example.com/
  zapr forcedBrowse --status
  zapr forcedBrowse --stop scan123
```

---

### Report Commands

#### `getReport` - Generate Reports

Generate security reports in various formats.

```bash
zapr getReport --format <format> [options]

Options:
  --format, -f           Report format: xml, json, md, html (required)
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)
  --name, -n             Output filename
  --title                Report title
  --template             Report template name
  --description          Report description

Examples:
  zapr getReport -f html --workspace ./results --name report.html
  zapr getReport -f json --workspace ./results --name report.json --title "Weekly Scan"
  zapr getReport -f xml --workspace ./results --name report.xml
```

#### `getPdf` - Generate PDF Report

Generate a PDF report from ZAP scan results.

```bash
zapr getPdf [options]

Options:
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)
  --name, -n             Output filename (default: report.pdf)
  --title, -t            Report title (default: "ZAP Security Scan Report")

Examples:
  zapr getPdf --workspace ./results
  zapr getPdf --workspace ./results --name scan-report.pdf --title "Security Audit"
```

#### `getAlerts` - Get Alerts

Retrieve and display security alerts.

```bash
zapr getAlerts [options]

Options:
  --base-url, -u         Filter by base URL
  --start                Start index for pagination (default: 0)
  --count                Maximum alerts to return
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)
  --name, -n             Output filename
  --summary, -s          Show alerts summary by risk level

Examples:
  zapr getAlerts
  zapr getAlerts --summary
  zapr getAlerts -u https://example.com --workspace ./results --name alerts.json
  zapr getAlerts --count 50
```

#### `createJUnitResults` - JUnit XML Output

Generate JUnit-compatible test results from alerts. High and Medium risk alerts are marked as failures, while Low and Informational alerts are marked as passing tests.

```bash
zapr createJUnitResults [options]

Options:
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)
  --name, -n             Output filename (required)
  --title, -t            Test suite title (default: "ZAP Security Scan")
  --base-url             Filter alerts by base URL

Examples:
  zapr createJUnitResults --workspace ./results --name junit-results.xml
  zapr createJUnitResults --workspace ./results --name results.xml -t "My App Scan" -u https://example.com
```

**Test Result Logic:**
- **Passed**: Low and Informational risk alerts
- **Failed**: High and Medium risk alerts

#### `utils create-excel-report` - Excel Report

Generate an Excel spreadsheet report from ZAP alerts. Reports include test result summaries with pass/fail breakdowns.

```bash
zapr utils create-excel-report [options]

Options:
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)
  --name, -n             Output filename (default: zap-report.xlsx)
  --base-url, -u         Filter alerts by base URL
  --input, -i            Input JSON file path (alternative to fetching from ZAP)

Examples:
  zapr utils create-excel-report --workspace ./results
  zapr utils create-excel-report --workspace ./results --name security-report.xlsx
  zapr utils create-excel-report --input ./alerts.json --workspace ./results --name report.xlsx
```

**Excel Sheets:**
- **Summary**: Test results overview with pass/fail counts and pass rate
- **All Alerts**: Complete list of all alerts
- **FAIL - High Risk**: High severity alerts
- **FAIL - Medium Risk**: Medium severity alerts
- **PASS - Low Risk**: Low severity alerts (passing tests)
- **PASS - Informational**: Informational alerts (passing tests)

#### `getDockerLog` - Get Docker Container Logs

Fetch logs from a Docker container using the Docker API.

```bash
zapr getDockerLog [options]

Options:
  --container, -c        Docker container name or ID
  --image, -i            Docker image name to find container by
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)
  --name, -n             Output filename (default: agent.log)
  --tail, -t             Number of lines to fetch (default: 500)

Examples:
  zapr getDockerLog --container my-container --workspace ./results
  zapr getDockerLog --image mockholm/zap-daemon --workspace ./results
```

---

### Session Management

#### `session` - Manage Sessions

Create, save, and manage ZAP sessions.

```bash
zapr session [options]

Options:
  --new, -n              Create new session with name
  --save, -s             Save current session with name
  --overwrite            Overwrite existing session file
  --sites, -l            List all sites in session
  --urls, -u             List all URLs in session
  --access-url, -a       Access URL and capture responses

Examples:
  zapr session --new my-scan
  zapr session --save backup --overwrite
  zapr session --sites
  zapr session --urls
  zapr session --access-url https://example.com
```

---

### Context & User Management

#### `context` - Manage Contexts

Create and manage ZAP contexts for organizing scans.

```bash
zapr context [options]

Options:
  --list, -l             List all contexts
  --new, -n              Create new context with name
  --context, -c          Context name (for other operations)
  --include              Include regex in context
  --exclude              Exclude regex from context
  --export               Export context to file
  --import               Import context from file

Examples:
  zapr context --list
  zapr context --new myapp
  zapr context --new api --include "https://api\.example\.com.*"
  zapr context --context myapp --exclude ".*logout.*"
```

#### `users` - Manage Users

Manage users for authenticated scanning.

```bash
zapr users [options]

Options:
  --list, -l             List users (requires --context)
  --new, -n              Create new user (requires --context)
  --remove               Remove user by ID (requires --context)
  --enable               Enable user by ID (requires --context)
  --disable              Disable user by ID (requires --context)
  --context, -c          Context name
  --credentials           Set authentication credentials
  --user-id              User ID

Examples:
  zapr users --list --context myapp
  zapr users --new testuser --context myapp
  zapr users --enable 1 --context myapp
```

---

### Search & Discovery

#### `search` - Search URLs/Messages

Search captured URLs and HTTP messages by regex.

```bash
zapr search --regex <pattern> [options]

Options:
  --regex, -r            Regular expression pattern (required)
  --urls, -u             Search URLs matching pattern
  --messages, -m         Search HTTP messages matching pattern

Examples:
  zapr search -r ".*\.json$" --urls
  zapr search -r "api/v[0-9]+" --messages
```

#### `getVersion` - Get ZAP Version

Check the connected ZAP version.

```bash
zapr getVersion
```

#### `getLogs` - Get Log Configuration

Display ZAP log configuration.

```bash
zapr getLogs
```

---

### Advanced Proxy Management

#### `httpSessions` - Manage HTTP Sessions

Manage HTTP sessions for authenticated scanning.

```bash
zapr httpSessions --site <hostname> [options]

Options:
  --site, -s              Site hostname (required)
  --list, -l              List sessions for site
  --create, -c            Create a new empty session
  --activate, -a          Set active session by name

Examples:
  zapr httpSessions --site example.com --list
  zapr httpSessions --site example.com --create mysession
```

#### `break` - Manage Break Points

Control break points for request/response interception.

```bash
zapr break [options]

Options:
  --add                   Add a new break point
  --type                  Break type: request, response
  --scope                 Break scope: all, mock, suite, tag
  --state                 Break state: all, on, off
  --match                 URL regex pattern to match
  --list, -l              List all break points
  --continue, -c          Continue the intercepted request/response

Examples:
  zapr break --list
  zapr break --add --type request --match ".*login.*"
  zapr break --continue
```

#### `proxy` - Proxy Chain Management

Manage proxy chain exclusions.

```bash
zapr proxy [options]

Options:
  --list, -l              List excluded domains
  --add                   Add domain to exclusion list
  --regex                 Treat value as regex
  --disable               Add as disabled

Examples:
  zapr proxy --list
  zapr proxy --add "localhost"
  zapr proxy --add ".*\.internal\.com" --regex
```

---

### Azure DevOps Integration

#### `createWorkItem` - Create Azure DevOps Work Items

Create bugs or tasks in Azure DevOps from ZAP alerts.

```bash
zapr createWorkItem [options]

Options:
  --organization, --org  Azure DevOps organization (required)
  --project, --proj       Project name (required)
  --pat                   Personal Access Token (required)
  --type                  Work item type: Bug, Task, User Story
  --title                 Work item title (required)
  --description           Work item description
  --severity              Bug severity (1-4)
  --priority              Work item priority (1-4)
  --area-path             Area path
  --iteration-path        Iteration path
  --base-url              Filter alerts by base URL
  --alert-id              Create work item from specific alert ID
  --threshold             Minimum risk level: High, Medium, Low

Examples:
  zapr azdo create-work-item --org myorg --proj myproject --pat $PAT \
    --title "Security Issue" --threshold High
```

#### `azdo create-test-result` - Create Azure DevOps Test Results

Create test runs in Azure DevOps from scan results.

```bash
zapr azdo create-test-result [options]

Options:
  --organization, --org  Azure DevOps organization (required)
  --project, --proj       Project name (required)
  --pat                   Personal Access Token (required)
  --test-run-name, -n      Test run name (required)
  --base-url              Filter alerts by base URL
  --build-id              Azure DevOps build ID
  --release-id            Azure DevOps release ID

Examples:
  zapr azdo create-test-result --org myorg --proj myproject --pat $PAT \
    --test-run-name "ZAP Security Scan"
```

---

### Utils Commands (`utils`)

The `utils` command provides utility commands for generating reports and exports.

```bash
zapr utils <subcommand> [options]
```

Available subcommands:
- `create-junit-results` - Generate JUnit XML results
- `get-pdf` - Generate PDF report
- `get-logs` - Get ZAP log messages

#### `utils create-junit-results` - JUnit XML Output

Generate JUnit-compatible test results from alerts. High and Medium risk alerts are marked as failures, while Low and Informational alerts are marked as passing tests.

```bash
zapr utils create-junit-results [options]

Options:
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)
  --name, -n             Output filename (required)
  --title, -t            Test suite title (default: "ZAP Security Scan")
  --base-url             Filter alerts by base URL

Examples:
  zapr utils create-junit-results --workspace ./results --name junit-results.xml
  zapr utils create-junit-results --workspace ./results --name results.xml -t "My App Scan" -u https://example.com
```

**Test Result Logic:**
- **Passed**: Low and Informational risk alerts
- **Failed**: High and Medium risk alerts

#### `utils get-pdf` - Generate PDF Report

Generate a PDF report from ZAP scan results.

```bash
zapr utils get-pdf [options]

Options:
  --workspace, -w        Output directory (default: ZAPR_WORKSPACE env)
  --name, -n             Output filename (default: report.pdf)
  --title, -t            Report title (default: "ZAP Security Scan Report")

Examples:
  zapr utils get-pdf --workspace ./results
  zapr utils get-pdf --workspace ./results --name scan-report.pdf --title "Security Audit"
```

#### `utils get-logs` - Get ZAP Log Messages

Retrieve ZAP log configuration and information.

```bash
zapr utils get-logs [options]
```

Examples:
  zapr utils get-logs
```

---

### Configuration

#### `zap configure-rules` - Configure Scanning Rules

Manage ZAP scanning rules and policies.

```bash
zapr zap configure-rules [options]

Options:
  --list, -l             List all rule configurations
  --reset                Reset specific rule (requires --scanner-id)
  --reset-all            Reset all rules to defaults
  --scanner-id           Scanner ID
  --threshold            Alert threshold: OFF, DEFAULT, LO, MEDIUM, HIGH
  --strength             Attack strength: DEFAULT, INSANE, LOW, MEDIUM, HIGH
  --policy-name          Scan policy name

Examples:
  zapr zap configure-rules --list
  zapr zap configure-rules --scanner-id 40012 --threshold HIGH
  zapr zap configure-rules --reset-all
```

---

## Workspace & Logging

Zapster uses a workspace directory for organizing all output files including logs and reports.

### Environment Variable

```bash
ZAPR_WORKSPACE=./zap-results
```

### Log File

All commands write logs to `<workspace>/zapr.log` in the format:

```
2026-03-21 20:46:33 [INFO] Starting spider scan on: https://example.com
2026-03-21 20:46:35 [INFO] Scan progress: 45%
2026-03-21 20:46:40 [INFO] ✓ Spider scan completed successfully!
```

### Progress Display

Progress bars are shown in terminal. In CI environments (GitHub Actions, etc.), progress is displayed as log messages instead.

---

## GitHub Actions

Zapster includes GitHub Actions workflows for automated security scanning.

### Daemon Workflow (Recommended)

The `zap-scan-daemon.yml` workflow starts ZAP as a daemon container and runs scans against your target.

```yaml
name: ZAP Security Scan (Daemon)

on:
  workflow_dispatch:
    inputs:
      target_url:
        description: 'Target URL to scan'
        required: true
        default: 'http://localhost:3000'
      zap_port:
        description: 'ZAP Port'
        required: false
        default: '8080'
      api_key:
        description: 'ZAP API Key'
        required: false
        default: 'zapr-api-key'

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    env:
      ZAP_HOST: 0.0.0.0
      ZAP_PORT: ${{ inputs.zap_port || '8080' }}
      ZAP_API_KEY: ${{ inputs.api_key || 'zapr-api-key' }}
      TARGET_URL: ${{ inputs.target_url || 'http://localhost:3000' }}
      ZAPR_WORKSPACE: zap-results

    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies
        run: pnpm install

      - name: Build project
        run: pnpm run build

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Create workspace
        run: mkdir -p $ZAPR_WORKSPACE

      - name: Start ZAP Daemon
        run: |
          pnpm run docker:start-daemon \
            --port $ZAP_PORT \
            --api-key $ZAP_API_KEY

      - name: Run scans
        run: |
          pnpm run zap:passive-scan --enable
          pnpm run zap:base-scan --url ${{ env.TARGET_URL }}
          pnpm run zap:active-scan --url ${{ env.TARGET_URL }}

      - name: Generate Reports
        run: |
          pnpm run zap:get-report --format json --workspace zap-results
          pnpm run utils:get-pdf --workspace zap-results

      - name: Stop ZAP Daemon
        if: always()
        run: pnpm run docker:stop-daemon

      - name: Upload Reports
        uses: actions/upload-artifact@v4
        with:
          name: zap-reports
          path: zap-results/
```

### Services Workflow (Legacy)

The original `zap-scan.yml` workflow uses Docker services:

```yaml
name: ZAP Security Scan

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    env:
      ZAP_HOST: localhost
      ZAP_PORT: 8080
      ZAP_API_KEY: zapr-api-key
      ZAPR_WORKSPACE: zap-results
    services:
      zap:
        image: mockholm/zap-daemon
        ports:
          - 8080:8080

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Build project
        run: npm run build

      - name: Create workspace directory
        run: mkdir -p $ZAPR_WORKSPACE

      - name: Run Spider Scan
        run: npm run zap:base-scan -- --url ${{ env.TARGET_URL }}

      - name: Run Active Scan
        run: npm run zap:active-scan -- --url ${{ env.TARGET_URL }}

      - name: Generate Reports
        run: |
          npm run zap:get-report -- --format json --workspace zap-results --name report.json
          npm run zap:get-report -- --format html --workspace zap-results --name report.html
          npm run utils:get-pdf -- --workspace zap-results --name report.pdf
          npm run utils:create-excel-report -- --workspace zap-results --name zap-report.xlsx
          npm run utils:create-junit-results -- --workspace zap-results --name junit-results.xml

      - name: Get Docker Logs
        run: npm run docker:get-docker-log -- --image mockholm/zap-daemon --workspace zap-results

      - name: Upload Reports
        uses: actions/upload-artifact@v4
        with:
          name: zap-reports
          path: zap-results/
```

### Generated Reports

The workflow generates the following reports:

| Report | File | Description |
|--------|------|-------------|
| JSON Report | `report.json` | Full scan results in JSON format |
| HTML Report | `report.html` | Human-readable HTML report |
| PDF Report | `report.pdf` | Printable PDF version |
| Excel Report | `zap-report.xlsx` | Spreadsheet with Summary, All Alerts, FAIL-High, FAIL-Medium, PASS-Low, PASS-Informational sheets |
| XML Report | `report.xml` | XML format report |
| JUnit Results | `junit-results.xml` | JUnit-compatible test results |
| Docker Logs | `agent.log` | ZAP container logs |
| OpenAPI Spec | `zap-openapi.yaml` | ZAP API specification |

---

## License

MIT
