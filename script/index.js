//Deep-6 GateWay Script
if (process.argv.includes('-help')) {
  console.log('=== Configuration Settings ===');
  console.log('Base.js Configuration Settings:');
  console.log('1. _initConfig():');
  console.log('   - Initializes the configuration settings for the base.js module.');
  console.log('   - Example: ds._initConfig();');
  console.log('2. _initVersionCommands():');
  console.log('   - Initializes the version management commands.');
  console.log('   - Example: ds.version.all();');
  console.log('Core.js Configuration Settings:');
  console.log('1. setLang(lang):');
  console.log('   - Sets the language for the core module.');
  console.log('   - Example: ds.setLang("en");');
  console.log('2. setSecuritySettings(settings):');
  console.log('   - Sets the security settings for the core module.');
  console.log('   - Example: ds.setSecuritySettings({ allowAnonymous: true });');
  console.log('3. setVersionConfig(config):');
  console.log('   - Sets the version configuration for the core module.');
  console.log('   - Example: ds.setVersionConfig({ family: { version: "1.0.0" } });');
}
if (process.argv.includes('-version')) {
  const version = 'Deep-Base Version 7b.0.1\nDeep-Base Beta Development Version\nStatus: Under Beta Development\nProprietary Development'
  console.log('Version:', version);
}