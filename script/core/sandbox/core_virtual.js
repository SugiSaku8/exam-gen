const core_virtual = class {
  /**
   * Constructor for creating a virtual iframe environment for Deep-Base
   * @param {function} callback - callback function to be called when iframe is loaded
   * @param {object} v_default - default value for the iframe's global variable
   */
  contructor(v_default) {
    const iframe = document.createElement("iframe");
    this.iframe = iframe;
    iframe.style.display = "none";
    document.body.appendChild(iframe);


  /**
   * iframe onload event handler
   * sets the default value for the iframe's global variable
   * calls the callback function with the iframe's window object as an argument
   */
    iframe.onload = function () {
        const iframeWindow = iframe.contentWindow;
      iframeWindow.safeGlobalVar = v_default;

      this.callback = iframeWindow;
    };
    iframe.src = "about:blank";
  }
  /**
   * Evaluate the given code string within the virtual iframe environment
   * @param {string} code - code string to be evaluated
   * @description
   * The code string is evaluated within the virtual iframe environment
   * and the result is passed to the callback function
   */
  eval(code) {
    this.callback(function (sandbox) {
      // サンドボックス環境内でコードを実行
      sandbox.eval(code);
    });
  }
};
export default core_virtual;