import core_build from "./core_build.js";

const sandbox = class {
  constructor(config) {
    this.builder = new core_build();
    builder.generate_config(config);
    for (const config of this.builder.generate()) {
      window.shell.log({
        from: "db.sandbox.init",
        config,
        level: "info",
      });
    }
  }
  eval(box, code) {
    try {
      this.builder["_" + box].eval(code);
    } catch (err) {
      window.shell.log({
        from: "db.sandbox.eval.err",
        message: `Failed to eval code in sandbox instance _${box}: ${err.message}`,
        level: "error",
      });
    }
  }
};
export default sandbox;