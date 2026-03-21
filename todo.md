# ZAP API Coverage - Missing Commands

This document tracks ZAP API methods that are not covered by commands in this project.

## Summary
- **Total ZAP API Methods:** 735
- **Currently Covered:** ~30 (across 26 commands)
- **Missing Coverage:** ~700 methods across 49 API categories

---

## High Priority

### ascan (Active Scan) - 75 methods missing
- `addExcludedParam`, `addScanPolicy`, `clearExcludedFromScan`, `excludeFromScan`, `importScanPolicy`, `modifyExcludedParam`
- `pause`, `pauseAllScans`, `removeAllScans`, `removeExcludedParam`, `removeScan`, `removeScanPolicy`, `resume`, `resumeAllScans`
- `scan`, `scanAsUser`, `setEnabledPolicies`
- All `setOption*` methods: `AddQueryParam`, `AllowAttackOnStart`, `AttackPolicy`, `DefaultPolicy`, `DelayInMs`, `EncodeCookieValues`, `HandleAntiCSRFTokens`, `HostPerScan`, `InjectPluginIdInHeader`, `MaxAlertsPerRule`, `MaxChartTimeInMins`, `MaxResultsToList`, `MaxRuleDurationInMins`, `MaxScanDurationInMins`, `MaxScansInUI`, `PromptInAttackMode`, `PromptToClearFinishedScans`, `RescanInAttackMode`, `ScanHeadersAllRequests`, `ScanNullJsonValues`, `ShowAdvancedDialog`, `TargetParamsEnabledRPC`, `TargetParamsInjectable`, `ThreadPerHost`
- `setPolicyAlertThreshold`, `setPolicyAttackStrength`, `skipScanner`, `stop`, `stopAllScans`, `updateScanPolicy`
- All view methods: `alertsIds`, `attackModeQueue`, `excludedFromScan`, `excludedParamTypes`, `excludedParams`, `messagesIds`
- All option getters + `policies`, `scanners`, `scans`, `status` views

### ajaxSpider - 40 methods missing
- `addAllowedResource`, `addExcludedElement`, `modifyExcludedElement`, `removeAllowedResource`, `removeExcludedElement`, `scanAsUser`, `setEnabledAllowedResource`
- All `setOption*`: `BrowserId`, `ClickDefaultElems`, `ClickElemsOnce`, `EnableExtensions`, `EventWait`, `LogoutAvoidance`, `MaxCrawlDepth`, `MaxCrawlStates`, `MaxDuration`, `NumberOfBrowsers`, `RandomInputs`, `ReloadWait`, `ScopeCheck`
- `stop`
- Views: `allowedResources`, `excludedElements`, `fullResults`, `numberOfResults`
- All option getters + `results`, `status`

### core - 80+ methods missing
- `deleteAlert`, `deleteAllAlerts`, `deleteSiteNode`
- `disableAllProxyChainExcludedDomains`, `disableClientCertificate`, `enableAllProxyChainExcludedDomains`, `enablePKCS12ClientCertificate`
- `generateRootCA`, `loadSession`, `modifyProxyChainExcludedDomain`, `removeProxyChainExcludedDomain`
- `runGarbageCollection`, `setHomeDirectory`, `setLogLevel`, `setMode`
- `setOption*`: `AlertOverridesFilePath`, `DefaultUserAgent`, `DnsTtlSuccessfulQueries`, `HttpStateEnabled`, `MaximumAlertInstances`, `MergeRelatedAlerts`, `ProxyChainName`, `ProxyChainPassword`, `ProxyChainPort`, `ProxyChainPrompt`, `ProxyChainRealm`, `ProxyChainSkipName`, `ProxyChainUserName`, `SingleCookieRequestHeader`, `TimeoutInSecs`, `UseProxyChain`, `UseProxyChainAuth`, `UseSocksProxy`
- `snapshotSession`, `sendRequest`, `createSbomZip`
- `fileDownload`, `fileUpload`
- Reports: `htmlreport`, `jsonreport`, `mdreport`, `xmlreport`
- `messageHar`, `messagesHar`, `messagesHarById`, `proxy.pac`, `rootcert`, `sendHarRequest`, `setproxy`
- All option getters, `alert`, `alerts`, `alertsSummary`, `childNodes`, `excludedFromProxy`, `homeDirectory`, `hosts`, `message`, `messages`, `messagesById`, `mode`, `numberOfAlerts`, `numberOfMessages`, `sessionLocation`, `sites`, `urls`, `zapHomePath`

### spider - 60+ methods missing
- `pause`, `pauseAllScans`, `resume`, `resumeAllScans`, `scanAsUser`
- `addDomainAlwaysInScope`, `disableAllDomainsAlwaysInScope`, `enableAllDomainsAlwaysInScope`, `modifyDomainAlwaysInScope`, `removeAllScans`, `removeDomainAlwaysInScope`, `removeScan`, `stopAllScans`
- All `setOption*`: `AcceptCookies`, `HandleODataParametersVisited`, `HandleParameters`, `LogoutAvoidance`, `MaxChildren`, `MaxDepth`, `MaxDuration`, `MaxParseSizeBytes`, `MaxScansInUI`, `ParseComments`, `ParseDsStore`, `ParseGit`, `ParseRobotsTxt`, `ParseSVNEntries`, `ParseSitemapXml`, `PostForm`, `ProcessForm`, `SendRefererHeader`, `ShowAdvancedDialog`, `SkipURLString`, `ThreadCount`, `UserAgent`
- Views: `addedNodes`, `allUrls`, `domainsAlwaysInScope`, `excludedFromScan`
- All option getters + `results`, `scans`

### authentication - 6 methods missing
- `setAuthenticationMethod`, `setLoggedInIndicator`, `setLoggedOutIndicator`
- `getAuthenticationMethod`, `getLoggedInIndicator`, `getLoggedOutIndicator`

### users - 10 methods missing
- `authenticateAsUser`, `pollAsUser`
- `setAuthenticationState`, `setCookie`, `setUserName`
- `getAuthenticationCredentials`, `getAuthenticationCredentialsConfigParams`, `getAuthenticationSession`, `getAuthenticationState`, `getUserById`

---

## Medium Priority

### accessControl - 4 methods
- `scan`, `writeHTMLreport`, `getScanProgress`, `getScanStatus`

### alert - 11 methods
- `addAlert`, `deleteAlert`, `deleteAlerts`, `deleteAllAlerts`, `updateAlert`, `updateAlertsConfidence`, `updateAlertsRisk`
- `alert`, `alertCountsByRisk`, `alertsByRisk`, `numberOfAlerts`

### automation - 3 methods (IMPLEMENTED)
- `endDelayJob`, `runPlan`, `planProgress`
- **Command:** `pnpm automate --file <plan.yaml>`
- **File:** `src/commands/automate.ts`
- **Example:** `examples/zap-automation.yaml`

### break - 9 methods
- `addHttpBreakpoint`, `break`, `drop`, `removeHttpBreakpoint`, `setHttpMessage`, `step`
- `httpMessage`, `isBreakAll`, `isBreakRequest`, `isBreakResponse`

### clientSpider - 3 methods
- `scan`, `stop`, `status`

### context - 13 methods
- `removeContext`, `setContextCheckingStrategy`, `setContextInScope`, `setContextRegexs`
- `context`, `excludeAllContextTechnologies`, `excludeContextTechnologies`, `excludeRegexs`, `excludedTechnologyList`, `includeRegexs`, `includedTechnologyList`, `technologyList`, `urls`

### exim - 9 methods
- `exportSitesTree`, `importHar`, `importModsec2Logs`, `importUrls`, `importZapLogs`, `pruneSitesTree`
- `exportHar`, `exportHarById`, `sendHarRequest`

### forcedUser - 4 methods
- `setForcedUser`, `setForcedUserModeEnabled`, `getForcedUser`, `isForcedUserModeEnabled`

### httpSessions - 13 methods
- `addDefaultSessionToken`, `addSessionToken`, `removeDefaultSessionToken`, `removeSession`, `removeSessionToken`, `renameSession`, `unsetActiveSession`
- `setDefaultSessionTokenEnabled`, `setSessionTokenValue`
- `activeSession`, `defaultSessionTokens`, `sessionTokens`, `sites`

### network - 48 methods
- `addAlias`, `addHttpProxyExclusion`, `addLocalServer`, `addPassThrough`, `addPkcs12ClientCertificate`, `addRateLimitRule`
- `generateRootCaCert`, `importRootCaCert`, `removeAlias`, `removeHttpProxyExclusion`, `removeLocalServer`, `removePassThrough`, `removeRateLimitRule`
- `setAliasEnabled`, `setConnectionTimeout`, `setDefaultUserAgent`, `setDnsTtlSuccessfulQueries`, `setHttpProxy`, `setHttpProxyAuthEnabled`, `setHttpProxyEnabled`, `setHttpProxyExclusionEnabled`, `setPassThroughEnabled`, `setRateLimitRuleEnabled`, `setRootCaCertValidity`, `setServerCertValidity`, `setSocksProxy`, `setSocksProxyEnabled`, `setUseClientCertificate`, `setUseGlobalHttpState`
- `proxy.pac`, `rootCaCert`, `setProxy`
- All view methods for getting current configuration

### openapi - 2 methods
- `importFile`, `importUrl`

### postman - 2 methods
- `importFile`, `importUrl`

### pscan (Passive Scan) - 15 methods
- `clearQueue`, `disableAllScanners`, `disableAllTags`, `disableScanners`, `enableAllScanners`, `enableAllTags`, `enableScanners`
- `setMaxAlertsPerRule`, `setScanOnlyInScope`, `setScannerAlertThreshold`
- `currentRule`, `currentTasks`, `maxAlertsPerRule`, `scanOnlyInScope`, `scanners`

### retest - 1 method
- `retest`

### ruleConfig - 2 methods
- `setRuleConfigValue`, `ruleConfigValue`

### script - 21 methods
- `clearGlobalCustomVar`, `clearGlobalVar`, `clearGlobalVars`, `clearScriptCustomVar`, `clearScriptVar`, `clearScriptVars`
- `disable`, `enable`, `remove`
- `setGlobalVar`, `setScriptVar`
- `listEngines`, `listTypes`
- `globalCustomVar`, `globalCustomVars`, `globalVar`, `globalVars`
- `scriptCustomVar`, `scriptCustomVars`, `scriptVar`, `scriptVars`

### search - 22 methods
- All HAR methods: `HarByHeaderRegex`, `HarByNoteRegex`, `HarByRequestRegex`, `HarByResponseRegex`, `HarByTagRegex`, `HarByUrlRegex`
- All `Messages*` methods by various criteria
- All `Urls*` methods by various criteria

### sessionManagement - 4 methods
- `setSessionManagementMethod`, `getSessionManagementMethod`, `getConfigParams`, `getSupportedMethods`

### soap - 2 methods
- `importFile`, `importUrl`

---

## Low Priority

### acsurf - 6 methods
- `addOptionToken`, `removeOptionToken`, `setOptionPartialMatchingEnabled`, `genForm`
- `optionPartialMatchingEnabled`, `optionTokensNames`

### alertFilter - 12 methods
- `addAlertFilter`, `addGlobalAlertFilter`, `applyAll`, `applyContext`, `applyGlobal`
- `removeAlertFilter`, `removeGlobalAlertFilter`
- `testAll`, `testContext`, `testGlobal`
- `alertFilterList`, `globalAlertFilterList`

### authorization - 2 methods
- `setBasicAuthorizationDetectionMethod`, `getAuthorizationDetectionMethod`

### autoupdate - 30 methods
- `downloadLatestRelease`, `installAddon`, `installLocalAddon`, `uninstallAddon`
- All `setOption*` and `viewOption*` methods
- Views: `installedAddons`, `isLatestVersion`, `latestVersionNumber`, `localAddons`, `marketplaceAddons`, `newAddons`, `updatedAddons`

### client - 5 methods
- `exportClientMap`, `reportEvent`, `reportObject`, `reportZestScript`, `reportZestStatement`

### custompayloads - 8 methods
- `addCustomPayload`, `disableCustomPayload`, `disableCustomPayloads`, `enableCustomPayload`, `enableCustomPayloads`, `removeCustomPayload`
- `customPayloads`, `customPayloadsCategories`

### dev - 1 method
- `openapi`

### graphql - 20 methods
- `importFile`, `importUrl`
- All `setOption*` and `viewOption*` methods

### hud - 38 methods
- Various HUD-related options and views

### keyboard - 2 methods
- `cheatsheetActionOrder`, `cheatsheetKeyOrder`

### localProxies - 3 methods
- `addAdditionalProxy`, `removeAdditionalProxy`, `additionalProxies`

### oast - 11 methods
- `setActiveScanService`, `setBoastOptions`, `setCallbackOptions`, `setDaysToKeepRecords`, `setInteractshOptions`
- Views: `getActiveScanService`, `getBoastOptions`, `getCallbackOptions`, `getDaysToKeepRecords`, `getInteractshOptions`, `getServices`

### paramDigger - 1 method
- `helloWorld`

### params - 1 method
- `params`

### pnh - 8 methods
- `monitor`, `oracle`, `startMonitoring`, `stopMonitoring`
- `fx_pnh.xpi`, `manifest`, `pnh`, `service`

### quickstartlaunch - 1 method
- `startPage`

### replacer - 4 methods
- `addRule`, `removeRule`, `setEnabled`, `rules`

### reports - 2 methods
- `templateDetails`, `templates`

### reveal - 2 methods
- `setReveal`, `reveal`

### revisit - 3 methods
- `revisitSiteOff`, `revisitSiteOn`, `revisitList`

### selenium - 22 methods
- Various browser and driver configuration options

### stats - 13 methods
- `clearStats`, `setOption*` methods
- All view methods for stats

### wappalyzer - 3 methods
- `listAll`, `listSite`, `listSites`

### websocket - 6 methods
- `sendTextMessage`, `setBreakTextMessage`
- `breakTextMessage`, `channels`, `message`, `messages`

---

## Currently Covered (for reference)

### Commands with API coverage:
1. **baseScan** - spider (scan, status, fullResults)
2. **activeScan** - ascan (scan, scans), core (version, accessUrl), alert (alerts, alertsSummary)
3. **ajaxScan** - ajaxSpider (scan, status)
4. **apiScan** - apiScan (scan, status, jsonReport, htmlReport), alert
5. **passiveScan** - pscan (setEnabled, recordsToScan)
6. **getReport** - reports (xmlReport, jsonReport, mdReport, htmlReport)
7. **getPdf** - reports (htmlReport)
8. **getAlerts** - alert (alerts, alertsSummary)
9. **getLogs** - core (version, getLogLevel)
10. **createJUnitResults** - alert (alerts)
11. **createTestResult** - alert (alerts)
12. **createWorkItem** - alert (alerts)
13. **createExcelReport** - alert (alerts)
14. **configureRules** - ruleConfig (allRuleConfigs, resetAllRuleConfigValues, resetRuleConfigValue), ascan (setScannerAlertThreshold, setScannerAttackStrength)
15. **getVersion** - core (version)
16. **session** - core (newSession, saveSession, getSites, getUrls, accessUrl)
17. **context** - context (contextList, newContext, includeInContext, excludeFromContext, exportContext, importContext)
18. **users** - users (usersList, newUser, removeUser, setUserEnabled, setAuthenticationCredentials)
19. **search** - search (urlsByRegex, messagesByRegex)
20. **forcedBrowse** - forcedBrowse (scan, stop, scans)
21. **httpSessions** - httpSessions (sessions, createEmptySession, setActiveSession)
22. **break** - break (addBreak, breakpoints, continue)
23. **proxy** - core/proxy (proxyChainExcludedDomains, addProxyChainExcludedDomain)
