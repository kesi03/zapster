export interface PM2BusPacket {
  process: {
    name: string;
    pm_id: number;
  };
  data: string;
  at?: number;
}

export type PM2ProcessInfo = { [key: string]: any } 

export interface TomlConfig {
  ENV?: {
    ZAP_DOWNLOADER_WORKSPACE?: string;
    ZAP_DOWNLOADER_DOWNLOADS?: string;
    ZAP_DOWNLOADER_INSTALL?: string;
    ZAP_DOWNLOADER_PACKAGES?: string;
    ZAP_DOWNLOADER_ZAP_HOME?: string;
  };
  SERVER?: {
    PORT?: number;
    HOST?: string;
  };
  PATHS?: {
    JAR_PATH?: string;
    DIR?: string;
    INSTALL_DIR?: string;
  };
  JAVA_OPTIONS?: {
    flags?: string[];
  };
  CONFIG?: {
    flags?: string[];
  };
  AUTOMATION?: {
    planPath?: string;
  };
}
