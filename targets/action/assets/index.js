class Action {
  /**
   * `extensionName: "com.bacon.2095.axun"`
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
      var script1 = document.createElement("script");
      script1.src = "//cdn.jsdelivr.net/npm/eruda";
      document.head.appendChild(script1);

      // Once the first script is loaded, initialize eruda
      script1.onload = function () {
        var script2 = document.createElement("script");
        script2.textContent = "eruda.init({ theme: 'dracula' });eruda.show();";
        document.head.appendChild(script2);
      };

      // Handle any potential errors while loading the script
      script1.onerror = function (ev) {
        const message = "message" in ev ? ev.message : ev.error;
        console.error("Error loading the eruda script:", ev);
        alert(
          "Error loading the Eruda script, this website may block scripting: " +
            message
        );
      };
    } catch (error) {
      console.error(error);
      alert(error);
    }
  }
}

// Must use var to ensure it's hoisted.
window.ExtensionPreprocessingJS = new Action();
