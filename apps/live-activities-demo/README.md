# Apple Targets Live Activity Demo

1. Make app `npx create-expo`
2. Add target `npx create-target widget`
3. Create local native module `npx create-expo-module --local`
4. Add bindings with project-specific `WidgetAttributes` that must be the same across the module and widget target.
5. Control the module from the React app!
6. Build the app `npx expo run:ios`
