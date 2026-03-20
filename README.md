# Zapster

A comprehensive CLI tool for OWASP ZAP (Zed Attack Proxy) security scanning.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Global Options](#global-options)
- [Commands](#commands)
  - [Scan Commands](#scan-commands)
  - [Report Commands](#report-commands)
  - [Session Management](#session-management)
  - [Context & User Management](#context--user-management)
  - [Search & Discovery](#search--discovery)
  - [Azure DevOps Integration](#azure-devops-integration)
  - [Configuration](#configuration-1)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/zapster.git
cd zapster

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
```

---

## Global Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--host` | `-H` | `localhost` | ZAP API host |
| `--port` | `-p` | `8080` | ZAP API port |
| `--api-key` | `-k` | (none) | ZAP API key |

---

## Commands

### Scan Commands

#### `baseScan` - Spider Scan

Discover URLs on a target site using the traditional spider.

```bash
zapster baseScan --url https://example.com [options]

Options:
  --url, -u              Target URL (required)
  --max-depth            Maximum crawl depth (0 = unlimited)
  --max-children         Limit children scanned (0 = unlimited)
  --recurse              Enable recursion (default: true)
  --poll-interval        Status check interval in ms (default: 2000)
  --timeout              Maximum wait time in ms (default: 300000)

Examples:
  zapster baseScan -u https://example.com
  zapster baseScan -u https://example.com --max-depth 3 --timeout 600000
```

#### `activeScan` - Active Scan

Run vulnerability testing against a target.

```bash
zapster activeScan --url https://example.com [options]

Options:
  --url, -u              Target URL (required)
  --context, -c          Context name for authenticated scanning
  --user-id              User ID for authenticated scanning
  --policy               Scan policy name
  --poll-interval        Status check interval in ms (default: 5000)
  --timeout              Maximum wait time in ms (default: 600000)

Examples:
  zapster activeScan -u https://example.com
  zapster activeScan -u https://example.com --context myapp --user-id 1
```

#### `ajaxScan` - AJAX Spider Scan

Crawl a site using a real browser (Firefox/Chrome).

```bash
zapster ajaxScan --url https://example.com [options]

Options:
  --url, -u              Target URL (required)
  --max-duration        Maximum duration in minutes (0 = unlimited)
  --max-crawl-depth      Maximum crawl depth
  --max-crawl-states     Maximum number of states to crawl
  --browser-id           Browser to use (firefox, chrome, chrome-headless)
  --poll-interval        Status check interval in ms (default: 5000)
  --timeout              Maximum wait time in ms (default: 600000)

Examples:
  zapster ajaxScan -u https://example.com
  zapster ajaxScan -u https://example.com --max-duration 10 --browser-id firefox
```

#### `passiveScan` - Passive Scan Management

Enable, disable, or check passive scanning status.

```bash
zapster passiveScan [options]

Options:
  --enable, -e           Enable passive scanning
  --disable, -d          Disable passive scanning
  --status, -s          Show passive scan status

Examples:
  zapster passiveScan --status
  zapster passiveScan --enable
```

#### `forcedBrowse` - Forced Browsing

Run dirb-style brute-force directory discovery.

```bash
zapster forcedBrowse [options]

Options:
  --scan, -s             Start scan on URL
  --stop                 Stop scan by ID
  --status               Show all forced browse scans
  --context, -c          Context name
  --poll-interval        Status check interval in ms (default: 5000)
  --timeout              Maximum wait time in ms (default: 300000)

Examples:
  zapster forcedBrowse --scan https://example.com/
  zapster forcedBrowse --status
  zapster forcedBrowse --stop scan123
```

---

### Report Commands

#### `getReport` - Generate Reports

Generate security reports in various formats.

```bash
zapster getReport --format <format> [options]

Options:
  --format, -f           Report format: xml, json, md, html (required)
  --output, -o           Output file path
  --title                Report title
  --template             Report template name
  --description         Report description

Examples:
  zapster getReport -f html -o report.html
  zapster getReport -f json -o report.json --title "Weekly Scan"
  zapster getReport -f xml | cat  # Output to stdout
```

#### `getAlerts` - Get Alerts

Retrieve and display security alerts.

```bash
zapster getAlerts [options]

Options:
  --base-url, -u         Filter by base URL
  --start                Start index for pagination (default: 0)
  --count                Maximum alerts to return
  --output, -o           Output file path (JSON)
  --summary, -s          Show alerts summary by risk level

Examples:
  zapster getAlerts
  zapster getAlerts --summary
  zapster getAlerts -u https://example.com -o alerts.json
  zapster getAlerts --count 50
```

#### `createJUnitResults` - JUnit XML Output

Generate JUnit-compatible test results from alerts.

```bash
zapster createJUnitResults --output <file> [options]

Options:
  --output, -o           Output file path (required)
  --title, -t            Test suite title (default: "ZAP Security Scan")
  --base-url             Filter alerts by base URL

Examples:
  zapster createJUnitResults -o junit-results.xml
  zapster createJUnitResults -o results.xml -t "My App Scan" -u https://example.com
```

---

### Session Management

#### `session` - Manage Sessions

Create, save, and manage ZAP sessions.

```bash
zapster session [options]

Options:
  --new, -n              Create new session with name
  --save, -s             Save current session with name
  --overwrite            Overwrite existing session file
  --sites, -l            List all sites in session
  --urls, -u             List all URLs in session
  --access-url, -a       Access URL and capture responses

Examples:
  zapster session --new my-scan
  zapster session --save backup --overwrite
  zapster session --sites
  zapster session --urls
  zapster session --access-url https://example.com
```

---

### Context & User Management

#### `context` - Manage Contexts

Create and manage ZAP contexts for organizing scans.

```bash
zapster context [options]

Options:
  --list, -l             List all contexts
  --new, -n              Create new context with name
  --context, -c          Context name (for other operations)
  --include              Include regex in context
  --exclude              Exclude regex from context
  --export               Export context to file
  --import               Import context from file

Examples:
  zapster context --list
  zapster context --new myapp
  zapster context --new api --include "https://api\.example\.com.*"
  zapster context --context myapp --exclude ".*logout.*"
  zapster context --context myapp --export context.json
  zapster context --import context.json
```

#### `users` - Manage Users

Manage users for authenticated scanning.

```bash
zapster users [options]

Options:
  --list, -l             List users (requires --context)
  --new, -n              Create new user (requires --context)
  --remove               Remove user by ID (requires --context)
  --enable               Enable user by ID (requires --context)
  --disable              Disable user by ID (requires --context)
  --context, -c          Context name
  --credentials          Set authentication credentials
  --user-id              User ID

Examples:
  zapster users --list --context myapp
  zapster users --new testuser --context myapp
  zapster users --enable 1 --context myapp
  zapster users --credentials "username=admin&password=secret" --user-id 1 --context myapp
```

---

### Search & Discovery

#### `search` - Search URLs/Messages

Search captured URLs and HTTP messages by regex.

```bash
zapster search --regex <pattern> [options]

Options:
  --regex, -r            Regular expression pattern (required)
  --urls, -u             Search URLs matching pattern
  --messages, -m         Search HTTP messages matching pattern

Examples:
  zapster search -r ".*\.json$" --urls
  zapster search -r "api/v[0-9]+" --messages
  zapster search -r "login|auth" --urls
```

#### `getVersion` - Get ZAP Version

Check the connected ZAP version.

```bash
zapster getVersion
```

#### `getLogs` - Get Log Configuration

Display ZAP log configuration.

```bash
zapster getLogs
```

---

### Azure DevOps Integration

#### `createWorkItem` - Create Azure DevOps Work Items

Create bugs or tasks in Azure DevOps from ZAP alerts.

```bash
zapster createWorkItem [options]

Options:
  --organization, --org  Azure DevOps organization (required)
  --project, --proj       Project name (required)
  --pat                   Personal Access Token (required)
  --type                  Work item type: Bug, Task, User Story (default: Bug)
  --title                 Work item title (required)
  --description           Work item description
  --severity              Bug severity (1-4)
  --priority              Work item priority (1-4)
  --area-path             Area path
  --iteration-path        Iteration path
  --base-url              Filter alerts by base URL
  --alert-id              Create work item from specific alert ID
  --threshold             Minimum risk level: High, Medium, Low (default: Medium)

Examples:
  zapster createWorkItem --org myorg --proj myproject --pat $PAT \
    --title "Security Issue" --threshold High
  zapster createWorkItem --org myorg --proj myproject --pat $PAT \
    --alert-id 123 --base-url https://example.com
```

#### `createTestResult` - Create Azure DevOps Test Results

Create test runs in Azure DevOps from scan results.

```bash
zapster createTestResult [options]

Options:
  --organization, --org  Azure DevOps organization (required)
  --project, --proj       Project name (required)
  --pat                   Personal Access Token (required)
  --test-run-name, -n      Test run name (required)
  --base-url              Filter alerts by base URL
  --build-id              Azure DevOps build ID
  --release-id            Azure DevOps release ID

Examples:
  zapster createTestResult --org myorg --proj myproject --pat $PAT \
    --test-run-name "ZAP Security Scan"
```

---

### Configuration

#### `configureRules` - Configure Scanning Rules

Manage ZAP scanning rules and policies.

```bash
zapster configureRules [options]

Options:
  --list, -l             List all rule configurations
  --reset                Reset specific rule (requires --scanner-id)
  --reset-all            Reset all rules to defaults
  --scanner-id           Scanner ID
  --threshold            Alert threshold: OFF, DEFAULT, LO, MEDIUM, HIGH
  --strength             Attack strength: DEFAULT, INSANE, LOW, MEDIUM, HIGH
  --policy-name          Scan policy name

Examples:
  zapster configureRules --list
  zapster configureRules --scanner-id 40012 --threshold HIGH
  zapster configureRules --scanner-id 40012 --strength LOW
  zapster configureRules --reset --scanner-id 40012
  zapster configureRules --reset-all
```

---

## Quick Start

```bash
# 1. Start ZAP daemon (example with Docker)
docker run -d --name zap -p 8080:8080 -e ZAP_API_KEY=my-api-key mockholm/zap-daemon

# 2. Run a spider scan
zapster baseScan --url https://example.com

# 3. Run an active scan
zapster activeScan --url https://example.com

# 4. Generate report
zapster getReport --format html --output report.html

# 5. Check alerts
zapster getAlerts --summary
```

## Complete Workflow Example

```bash
# Start ZAP
docker run -d --name zap -p 8080:8080 -e ZAP_API_KEY=secret mockholm/zap-daemon

# Configure (if using API key)
export ZAP_API_KEY=secret

# Create session
zapster session --new my-app-scan

# Create context
zapster context --new myapp
zapster context --context myapp --include "https://myapp\.com.*"

# Run scans
zapster passiveScan --enable
zapster baseScan --url https://myapp.com
zapster ajaxScan --url https://myapp.com --max-duration 5
zapster activeScan --url https://myapp.com

# Get results
zapster getAlerts --output alerts.json
zapster getAlerts --summary
zapster getReport --format html --output report.html

# Generate JUnit results for CI/CD
zapster createJUnitResults --output test-results.xml

# Save session
zapster session --save final-scan

# Cleanup
docker stop zap
```

## License

MIT
