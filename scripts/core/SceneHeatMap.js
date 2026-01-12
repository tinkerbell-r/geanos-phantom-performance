import { GPP } from "../main.js";
import { ScenePhantomStorage } from "./ScenePhantomStorage.js";

/**
 * Tracks usage of Scenes and handles automated phantomization (Decay).
 */
export class SceneHeatMap {
    static IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 Minutes
    static CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minutes

    constructor() {
        this.runLoop = null;
    }

    start() {
        console.log("GPP | Starting Scene HeatMap...");

        // Hooks to update timestamp
        Hooks.on("canvasReady", (canvas) => {
            if (canvas.scene) {
                this.touch(canvas.scene);
            }
        });

        // Loop
        this.runLoop = setInterval(() => this.processDecay(), SceneHeatMap.CHECK_INTERVAL_MS);
    }

    touch(scene) {
        if (!game.user.isGM) return; // Only GM manages lifecycle logic
        const now = Date.now();
        scene.setFlag(ScenePhantomStorage.FLAG_SCOPE, "lastActive", now);
    }

    async processDecay() {
        if (!game.user.isGM) return;

        console.log("GPP | Running Scene Decay Cycle...");
        const now = Date.now();
        const scenes = game.scenes.contents;

        for (const scene of scenes) {
            // Skip currently active or viewed
            if (scene.active || scene.isView) {
                this.touch(scene); // Ensure active scenes stay hot
                continue;
            }

            // check if Phantom
            if (GPP.sceneStorage.isPhantom(scene)) continue;

            const lastActive = scene.getFlag(ScenePhantomStorage.FLAG_SCOPE, "lastActive") || 0;
            const timeSince = now - lastActive;

            if (timeSince > SceneHeatMap.IDLE_THRESHOLD_MS) {
                console.log(`GPP | Scene ${scene.name} is cold (${Math.round(timeSince / 60000)} mins). Phantomizing...`);
                await GPP.sceneStorage.swapOut(scene);
            }
        }
    }
}
