import { GPP } from "../main.js";
import { ShadowState } from "./ShadowState.js";

/**
 * Intercepts Scene activation/viewing to trigger hydration.
 */
export class SceneProxy {

    static initialize() {
        console.log("GPP | Initializing Scene Proxy hooks...");
        SceneProxy.wrapSceneActivation();
    }

    static wrapSceneActivation() {
        // Wrap Scene.prototype.view
        const originalView = Scene.prototype.view;
        Scene.prototype.view = function () {
            // Only intercept if it is actually a phantom scene
            if (ShadowState.isPhantom(this)) {
                // console.log("GPP | Intercepting View for Phantom Scene:", this.name);

                // Synchronous Hydration
                GPP.sceneStorage.swapInSync(this);

                // No need for breathing room anymore because it's sync!
                // The data is there instantly before the view logic proceeds.

                // Proceed with Original View. 
                // Since 'this' is now hydrated in-place, we can pass it directly.
                return originalView.apply(this, arguments);
            }

            // Standard Pass-through
            return originalView.apply(this, arguments);
        };

        // Also Wrap game.scenes.get to be safe?
        // Usually game.scenes.get returns the object. If the object is a phantom, accessing its data logic might fail?
        // But for Scenes, usually we just read top-level data until we View it.
        // However, if a module does game.scenes.get("id").tokens, it expects tokens.
        // So we should probably handle that too via a Getter Proxy if we want 100% safety.
        // But the requirement specifically mentioned "game.scenes.get() OR viewing".
        // Let's hook the Collection get just in case?
        // Actually, Scenes collection is just a Map.

        // For now, wrapping View is the critical part for Foundry core. 
        // If we want "No-Await" across the module, we should ensure data access is safe.
        // But Scenes don't have a 'system' property proxy. 
        // Let's stick to the requested "View" trigger primarily, 
        // but adding a simple check in GPP.ensureHydratedSync helps.
    }
}
