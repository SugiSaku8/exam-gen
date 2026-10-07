import core_virtual from "./core_virtual";
const core_build = class {
  /**
   * Initializes the core build object.
   * If Deep-Base has not been initialized, an error will be thrown.
   * @returns {Number} The status of the initialization. 2 if the initialization failed.
   */
  constructor() {
    if (!window.db) {
      console.error("Error! Deep-Base has not been initialized.");
      console.error("Return Status:2");
      return 2;
    } else {
    }
  }
  /**
   * Generate a configuration based on the input config.
   * @param {Object} config - The configuration to generate.
   * @returns {Object} The generated configuration.
   * **/
  generate_config(config) {
    switch (config.type) {
      case "basic_config":
        return {
          name: config.name || "deep-base-sandbox",
          version: config.version || "7.0.0",
          description:
            config.description ||
            "This is the basic configuration for Deep-Base Sandbox.",
          _build_type: config._build_type || "virtualsandbox",
          _build_counts: config._build_counts || 1,
          _build_default_var: config._build_default_var || ["all"],
          _build_load_scripts: config._build_load_scripts || [],
        };
      //write here code of generate basic_config
      default:
        window.shell.log({
          from: "db.sandbox.build",
          message: `The option you specified ${type} is not registered as a build option.
Please check db.sandbox.build.help().`,
          level: "info",
        });
    }
  }
  /**
   * Generate a basic configuration based on the default settings.
   * This generator will yield an object with the generated configuration.
   * @yields {Object} The generated configuration.
   */
  *generate() {
    yield (this.config = this.generate_config("basic_config"));
    while (((i = 0), i < this.config._build_counts, i++)) {
      try {
        yield Function(
          "this._" + i + " = new core_virtual(this.config._build_default_var);"
        )();
        yield this["_" + i].eval(this.config._build_load_scripts);
        window.shell.log({
          from: "db.sandbox.build",
          message: `Sandbox instance _${i} has been created.`,
          level: "info",
        });
      } catch (err) {
        window.shell.log({
          from: "db.sandbox.build.err",
          message: `Failed to create sandbox instance _${i}: ${err.message}`,
          level: "error",
        });
      }
    }
    yield window.shell.log({
      from: "db.sandbox.build",
      message: `Sandbox build process completed.`,
      level: "info",
    }); 
  }
};
export default core_build;
