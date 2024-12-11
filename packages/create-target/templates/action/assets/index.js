class Action {
  /**
   * `extensionName: "com.bacon.2095.action"`
   * @param {*} arguments: {completionFunction: () => unknown; extensionName: string; }
   */
  // run({ extensionName, completionFunction }) {
  //   // Here, you can run code that modifies the document and/or prepares
  //   // things to pass to your action's native code.

  //   // We will not modify anything, but will pass the body's background
  //   // style to the native code.
  //   completionFunction({
  //     /* */
  //   });
  // }

  finalize() {
    try {
      alert("finalize");
    } catch (error) {
      console.error(error);
      alert("message" in error ? error.message : error);
    }
  }
}

// Must use window to ensure it's hoisted.
window.ExtensionPreprocessingJS = new Action();
