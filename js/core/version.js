// Deep-School Version Management System
class VersionManager {
  constructor() {
    this.versionConfig = null;
    this.configPath = './version.config.json';
  }

  // バージョン設定を読み込み
  async loadVersionConfig() {
    try {
      const response = await fetch(this.configPath);
      if (!response.ok) {
        throw new Error(`Failed to load version config: ${response.status}`);
      }
      this.versionConfig = await response.json();
      return this.versionConfig;
    } catch (error) {
      console.error('Version config load error:', error);
      // フォールバック用のデフォルト設定
      this.versionConfig = "Called Error From version.mjs"
      return this.versionConfig;
    }
  }

  // バージョン情報を取得
  getVersion(component = 'all') {
    if (!this.versionConfig) {
      return { error: 'Version config not loaded' };
    }

    if (component === 'all') {
      return this.versionConfig;
    }

    const componentMap = {
     // コンポーネント名とversionConfigのキーのマッピング
    };

    const configKey = componentMap[component.toLowerCase()];
    if (!configKey || !this.versionConfig[configKey]) {
      return { error: `Unknown component: ${component}` };
    }

    return this.versionConfig[configKey];
  }

  // バージョン情報を表示用にフォーマット
  formatVersion(component = 'all') {
    const version = this.getVersion(component);
    
    if (version.error) {
      return `Error: ${version.error}`;
    }

    if (component === 'all') {
      let output = '=== Deep-School Family Software Versions ===\n\n';
      // 全てのキーをループ
      const skipKeys = ['releaseSchedule'];
      for (const [key, value] of Object.entries(version)) {
        if (skipKeys.includes(key)) continue;
        // アイコンとラベルを決定
        let icon = '';
        let label = key;
        switch (key) {
          // コンポーネントごとのアイコンとラベル設定
        }
        output += `${icon} ${label}: v${value.version} (${value.status})\n`;
        if (value.cycle !== undefined) output += `   Cycle: ${value.cycle}, Release: ${value.release}, Revision: ${value.revision}\n`;
        if (value.lastUpdated) output += `   Last Updated: ${value.lastUpdated}\n`;
        if (value.description) output += `   Description: ${value.description}\n`;
        output += `\n`;
      }
      output += '=== Release Schedule ===\n';
      output += `Next Cycle Update: ${version.releaseSchedule?.nextCycleUpdate || 'Not specified'}\n`;
      return output;
    } else {
      const comp = version;
      let output = `=== ${component.toUpperCase()} Version ===\n\n`;
      if (comp.version) {
        output += `Version: ${comp.version}\n`;
      }
      if (comp.status) {
        output += `Status: ${comp.status}\n`;
      }
      if (comp.cycle !== undefined) {
        output += `Cycle: ${comp.cycle}\n`;
      }
      if (comp.release !== undefined) {
        output += `Release: ${comp.release}\n`;
      }
      if (comp.revision !== undefined) {
        output += `Revision: ${comp.revision}\n`;
      }
      output += `Last Updated: ${comp.lastUpdated}\n`;
      output += `Description: ${comp.description}\n`;
      return output;
    }
  }

  // バージョン比較
  compareVersions(version1, version2) {
    const parseVersion = (version) => {
      if (typeof version === 'string') {
        const parts = version.replace('v', '').split('.');
        return {
          cycle: parseInt(parts[0]) || 0,
          release: parseInt(parts[1]) || 0,
          revision: parseInt(parts[2]) || 0
        };
      }
      return version;
    };

    const v1 = parseVersion(version1);
    const v2 = parseVersion(version2);

    if (v1.cycle !== v2.cycle) {
      return v1.cycle > v2.cycle ? 1 : -1;
    }
    if (v1.release !== v2.release) {
      return v1.release > v2.release ? 1 : -1;
    }
    if (v1.revision !== v2.revision) {
      return v1.revision > v2.revision ? 1 : -1;
    }
    return 0;
  }

  // アップデートチェック
  checkForUpdates() {
    if (!this.versionConfig) {
      return { error: 'Version config not loaded' };
    }

    const updates = {};
    for (const [key, value] of Object.entries(this.versionConfig)) {
      // ここで最新バージョン情報を取得するロジックを実装（例: サーバー問い合わせ）
      const latestVersion = value; // 仮に同じバージョンとする

      const comparison = this.compareVersions(value, latestVersion);
      if (comparison === -1) {
        updates[key] = {
          current: value,
          latest: latestVersion
        };
      }
  }
}
}

export const versionManager = new VersionManager(); 