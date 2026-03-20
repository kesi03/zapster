import { ZapConfig } from '../types';
import { ZapBase } from './zapBase';
import { CoreAPI } from './core';
import { SpiderAPI, AjaxSpiderAPI } from './spider';
import { ActiveScanAPI } from './ascan';
import { PassiveScanAPI } from './pscan';
import { AlertsAPI } from './alerts';
import { ReportsAPI } from './reports';
import { ContextAPI } from './context';
import { UsersAPI } from './users';
import { AuthAPI } from './auth';
import { ScriptsAPI } from './scripts';
import { ForcedBrowseAPI } from './forcedBrowse';
import { SearchAPI } from './search';
import { HttpSessionsAPI } from './httpSessions';
import { BreakAPI } from './break';
import { ProxyAPI } from './proxy';

export class ZapClient extends ZapBase {
  core: CoreAPI;
  spider: SpiderAPI;
  ajaxSpider: AjaxSpiderAPI;
  ascan: ActiveScanAPI;
  pscan: PassiveScanAPI;
  alerts: AlertsAPI;
  reports: ReportsAPI;
  context: ContextAPI;
  users: UsersAPI;
  auth: AuthAPI;
  scripts: ScriptsAPI;
  forcedBrowse: ForcedBrowseAPI;
  search: SearchAPI;
  httpSessions: HttpSessionsAPI;
  break: BreakAPI;
  proxy: ProxyAPI;

  constructor(config: ZapConfig) {
    super(config);

    this.core = new CoreAPI(config);
    this.spider = new SpiderAPI(config);
    this.ajaxSpider = new AjaxSpiderAPI(config);
    this.ascan = new ActiveScanAPI(config);
    this.pscan = new PassiveScanAPI(config);
    this.alerts = new AlertsAPI(config);
    this.reports = new ReportsAPI(config);
    this.context = new ContextAPI(config);
    this.users = new UsersAPI(config);
    this.auth = new AuthAPI(config);
    this.scripts = new ScriptsAPI(config);
    this.forcedBrowse = new ForcedBrowseAPI(config);
    this.search = new SearchAPI(config);
    this.httpSessions = new HttpSessionsAPI(config);
    this.break = new BreakAPI(config);
    this.proxy = new ProxyAPI(config);
  }
}
